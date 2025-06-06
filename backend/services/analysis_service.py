# 分析服务模块 - 负责数据分析和可视化数据生成

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from services.data_service import DataService
import os
import traceback

class AnalysisService:
    def __init__(self):
        self.data_service = DataService()
    
    def analyze_knowledge_mastery(self, student_id=None):
        """分析知识点掌握程度
        
        Args:
            student_id: 学生ID，如果为None则分析所有学生
            
        Returns:
            知识点掌握度分析结果
        """
        # 获取所有提交记录
        all_submissions = pd.DataFrame(self.data_service.get_all_submissions())
        if all_submissions.empty:
            return {'status': 'error', 'message': '没有找到提交记录数据'}
        
        # 获取题目信息
        questions = pd.DataFrame(self.data_service.get_questions())
        if questions.empty:
            return {'status': 'error', 'message': '没有找到题目数据'}
        
        # 如果指定了学生ID，则只分析该学生的数据
        if student_id:
            submissions = all_submissions[all_submissions['student_ID'] == student_id]
            if submissions.empty:
                return {'status': 'error', 'message': f'没有找到学生 {student_id} 的提交记录'}
        else:
            submissions = all_submissions
        
        # 合并提交记录和题目信息
        merged_data = pd.merge(submissions, questions, on='title_ID', how='left')

        # 处理缺失值
        merged_data.fillna({'knowledge': '未知'}, inplace=True)
        merged_data.fillna({'sub_knowledge': '未知'}, inplace=True)
        
        # 计算每个知识点的掌握程度
        knowledge_mastery = {}
        
        # 按知识点分组
        for knowledge, group in merged_data.groupby('knowledge'):
            # 计算该知识点的掌握程度（基于题目Mastery值的平均）
            if 'Mastery' in group.columns:
                # 使用题目的Mastery值计算平均掌握程度
                mastery_values = pd.to_numeric(group['Mastery'], errors='coerce')
                correct_rate = mastery_values.mean() if not mastery_values.isna().all() else 0
            else:
                # 如果没有Mastery列，回退到原来的计算方式
                total_score = group['score_y'].sum()  # 题目总分
                earned_score = group['score_x'].sum()  # 获得的分数
                correct_rate = earned_score / total_score if total_score > 0 else 0
            
            # 计算该知识点的提交次数和正确提交次数
            total_submissions = len(group)
            correct_submissions = len(group[group['state'] == 'Absolutely_Correct'])
            
            # 计算正确提交率
            correct_submission_rate = correct_submissions / total_submissions if total_submissions > 0 else 0
            
            # 计算平均用时
            group = group.copy()  # 创建副本以避免SettingWithCopyWarning
            # 处理异常值，如"--"或"-"等非数值
            group.loc[:, 'timeconsume'] = group['timeconsume'].replace(['--', '-'], np.nan).infer_objects(copy=False)
            group.loc[:, 'timeconsume'] = pd.to_numeric(group['timeconsume'], errors='coerce')
            avg_time_consume = group['timeconsume'].mean()
            
            # 存储该知识点的掌握情况
            knowledge_mastery[knowledge] = {
                'correct_rate': float(correct_rate),
                'mastery_level': float(correct_rate),  # 掌握程度，与correct_rate相同但语义更明确
                'correct_submission_rate': float(correct_submission_rate),
                'avg_time_consume': float(avg_time_consume),
                'total_submissions': int(total_submissions),
                'correct_submissions': int(correct_submissions)
            }
            
            # 分析该知识点的从属知识点掌握情况
            sub_knowledge_mastery = {}
            for sub_knowledge, sub_group in group.groupby('sub_knowledge'):
                # 计算从属知识点的掌握程度（基于题目Mastery值的平均）
                if 'Mastery' in sub_group.columns:
                    # 使用题目的Mastery值计算平均掌握程度
                    sub_mastery_values = pd.to_numeric(sub_group['Mastery'], errors='coerce')
                    sub_correct_rate = sub_mastery_values.mean() if not sub_mastery_values.isna().all() else 0
                else:
                    # 如果没有Mastery列，回退到原来的计算方式
                    sub_total_score = sub_group['score_y'].sum()
                    sub_earned_score = sub_group['score_x'].sum()
                    sub_correct_rate = sub_earned_score / sub_total_score if sub_total_score > 0 else 0
                
                sub_total_submissions = len(sub_group)
                sub_correct_submissions = len(sub_group[sub_group['state'] == 'Absolutely_Correct'])
                sub_correct_submission_rate = sub_correct_submissions / sub_total_submissions if sub_total_submissions > 0 else 0
                
                # 处理异常值，如"--"或"-"等非数值
                sub_group = sub_group.copy()  # 创建副本以避免SettingWithCopyWarning
                sub_group.loc[:, 'timeconsume'] = sub_group['timeconsume'].replace(['--', '-'], np.nan).infer_objects(copy=False)
                sub_group.loc[:, 'timeconsume'] = pd.to_numeric(sub_group['timeconsume'], errors='coerce')
                sub_avg_time_consume = sub_group['timeconsume'].mean()
                
                sub_knowledge_mastery[sub_knowledge] = {
                    'correct_rate': float(sub_correct_rate),
                    'mastery_level': float(sub_correct_rate),  # 掌握程度，与correct_rate相同但语义更明确
                    'correct_submission_rate': float(sub_correct_submission_rate),
                    'avg_time_consume': float(sub_avg_time_consume),
                    'total_submissions': int(sub_total_submissions),
                    'correct_submissions': int(sub_correct_submissions)
                }
            
            knowledge_mastery[knowledge]['sub_knowledge'] = sub_knowledge_mastery
        
        # 识别薄弱环节
        weak_points = []
        for knowledge, data in knowledge_mastery.items():
            if data['correct_rate'] < 0.6:  # 正确率低于60%视为薄弱环节
                weak_points.append({
                    'knowledge': knowledge,
                    'correct_rate': data['correct_rate'],
                    'reason': '正确率较低'
                })
            
            # 检查从属知识点
            for sub_knowledge, sub_data in data['sub_knowledge'].items():
                if sub_data['correct_rate'] < 0.5:  # 从属知识点正确率低于50%
                    weak_points.append({
                        'knowledge': knowledge,
                        'sub_knowledge': sub_knowledge,
                        'correct_rate': sub_data['correct_rate'],
                        'reason': '从属知识点正确率较低'
                    })
        
        # 计算全体学生的平均掌握程度和平均正确提交率
        overall_averages = {}
        if not student_id:  # 如果分析的是所有学生，计算平均值
            for knowledge, data in knowledge_mastery.items():
                overall_averages[knowledge] = {
                    'avg_mastery_level': data['mastery_level'],
                    'avg_correct_submission_rate': data['correct_submission_rate']
                }
        else:  # 如果分析的是单个学生，需要获取全体学生的平均值
            all_result = self.analyze_knowledge_mastery(None)
            if all_result['status'] == 'success':
                for knowledge, data in all_result['knowledge_mastery'].items():
                    overall_averages[knowledge] = {
                        'avg_mastery_level': data['mastery_level'],
                        'avg_correct_submission_rate': data['correct_submission_rate']
                    }
        
        return {
            'status': 'success',
            'student_id': student_id,
            'knowledge_mastery': knowledge_mastery,
            'overall_averages': overall_averages,
            'weak_points': weak_points
        }
    
    def analyze_knowledge_scatter_data(self):
        """分析知识点掌握程度与正确率关系数据，用于散点图展示
        
        Returns:
            知识点散点图数据
        """
        try:
            # 获取所有提交记录
            all_submissions = pd.DataFrame(self.data_service.get_all_submissions())
            if all_submissions.empty:
                return {'status': 'error', 'message': '没有找到提交记录数据'}
            
            # 获取题目信息
            questions = pd.DataFrame(self.data_service.get_questions())
            if questions.empty:
                return {'status': 'error', 'message': '没有找到题目数据'}
            
            # 合并提交记录和题目信息
            merged_data = pd.merge(all_submissions, questions, on='title_ID', how='left')
            
            # 处理缺失值
            merged_data.fillna({'knowledge': '未知'}, inplace=True)
            
            knowledge_scatter_data = []
            
            # 按知识点分组分析
            for knowledge, group in merged_data.groupby('knowledge'):
                # 计算平均掌握程度
                if 'Mastery' in group.columns:
                    mastery_values = pd.to_numeric(group['Mastery'], errors='coerce')
                    avg_mastery = mastery_values.mean() if not mastery_values.isna().all() else 0
                else:
                    avg_mastery = 0
                
                # 计算正确率
                total_submissions = len(group)
                correct_submissions = len(group[group['state'] == 'Absolutely_Correct'])
                correct_rate = correct_submissions / total_submissions if total_submissions > 0 else 0
                
                # 计算该知识点的题目数量
                question_count = len(group['title_ID'].unique())
                
                knowledge_scatter_data.append({
                    'knowledge': knowledge,
                    'avg_mastery': float(avg_mastery),
                    'correct_rate': float(correct_rate),
                    'question_count': int(question_count),
                    'total_submissions': int(total_submissions)
                })
            
            return {
                'status': 'success',
                'knowledge_scatter_data': knowledge_scatter_data
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'分析知识点散点图数据时出错: {str(e)}'
            }
    
    def analyze_sub_knowledge_scatter_data(self):
        """分析子知识点掌握程度与正确率关系数据，用于散点图展示
        
        Returns:
            子知识点散点图数据
        """
        try:
            # 获取所有提交记录
            all_submissions = pd.DataFrame(self.data_service.get_all_submissions())
            if all_submissions.empty:
                return {'status': 'error', 'message': '没有找到提交记录数据'}
            
            # 获取题目信息
            questions = pd.DataFrame(self.data_service.get_questions())
            if questions.empty:
                return {'status': 'error', 'message': '没有找到题目数据'}
            
            # 合并提交记录和题目信息
            merged_data = pd.merge(all_submissions, questions, on='title_ID', how='left')
            
            # 处理缺失值
            merged_data.fillna({'sub_knowledge': '未知'}, inplace=True)
            
            sub_knowledge_scatter_data = []
            
            # 按子知识点分组分析
            for sub_knowledge, group in merged_data.groupby('sub_knowledge'):
                # 计算平均掌握程度
                if 'Mastery' in group.columns:
                    mastery_values = pd.to_numeric(group['Mastery'], errors='coerce')
                    avg_mastery = mastery_values.mean() if not mastery_values.isna().all() else 0
                else:
                    avg_mastery = 0
                
                # 计算正确率
                total_submissions = len(group)
                correct_submissions = len(group[group['state'] == 'Absolutely_Correct'])
                correct_rate = correct_submissions / total_submissions if total_submissions > 0 else 0
                
                # 计算该子知识点的题目数量
                question_count = len(group['title_ID'].unique())
                
                sub_knowledge_scatter_data.append({
                    'sub_knowledge': sub_knowledge,
                    'avg_mastery': float(avg_mastery),
                    'correct_rate': float(correct_rate),
                    'question_count': int(question_count),
                    'total_submissions': int(total_submissions)
                })
            
            return {
                'status': 'success',
                'sub_knowledge_scatter_data': sub_knowledge_scatter_data
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'分析子知识点散点图数据时出错: {str(e)}'
            }

    def analyze_knowledge_mastery_timeseries(self, student_id=None):
        """分析知识点掌握程度的时序变化
        
        Args:
            student_id: 学生ID，如果为None则分析所有学生的平均情况
            
        Returns:
            知识点掌握度时序分析结果
        """
        # 获取所有提交记录
        all_submissions = pd.DataFrame(self.data_service.get_all_submissions())
        if all_submissions.empty:
            return {'status': 'error', 'message': '没有找到提交记录数据'}
        
        # 获取题目信息
        questions = pd.DataFrame(self.data_service.get_questions())
        if questions.empty:
            return {'status': 'error', 'message': '没有找到题目数据'}
        
        # 如果指定了学生ID，则只分析该学生的数据
        if student_id:
            submissions = all_submissions[all_submissions['student_ID'] == student_id]
            if submissions.empty:
                return {'status': 'error', 'message': f'没有找到学生 {student_id} 的提交记录'}
        else:
            submissions = all_submissions
        
        # 合并提交记录和题目信息
        merged_data = pd.merge(submissions, questions, on='title_ID', how='left')
        
        # 处理缺失值和无效值
        merged_data = merged_data.copy()
        # 过滤掉无效的知识点和子知识点
        merged_data = merged_data[merged_data['knowledge'].notna() & (merged_data['knowledge'] != '')]
        merged_data.loc[merged_data['sub_knowledge'].isna() | (merged_data['sub_knowledge'] == ''), 'sub_knowledge'] = '未分类'
        
        # 转换时间戳为datetime对象（转换为北京时间 UTC+8）
        merged_data.loc[:, 'datetime'] = pd.to_datetime(merged_data['time'], unit='s', utc=True)
        # 转换为北京时间
        merged_data.loc[:, 'datetime'] = merged_data['datetime'].dt.tz_convert('Asia/Shanghai')
        
        # 按时间排序
        merged_data = merged_data.sort_values('datetime')
        
        # 计算时序掌握度数据
        timeseries_data = {}
        
        # 按知识点分组
        for knowledge, knowledge_group in merged_data.groupby('knowledge'):
            # 跳过无效的知识点
            if not knowledge or knowledge == 'undefined' or knowledge == '未知':
                continue
                
            knowledge_timeline = []
            sub_knowledge_data = {}
            
            # 直接使用CSV中的Mastery字段作为掌握度
            for idx, row in knowledge_group.iterrows():
                # 使用CSV中的Mastery字段
                mastery_level = float(row['Mastery']) if not pd.isnull(row['Mastery']) else 0.0
                
                knowledge_timeline.append({
                    'timestamp': int(row['time']),
                    'mastery_level': float(mastery_level),  # 直接使用Mastery字段
                    'state': row['state'],
                    'score': float(row['score_x']) if not pd.isnull(row['score_x']) else 0
                })
            
            # 计算子知识点的时序掌握度
            for sub_knowledge, sub_group in knowledge_group.groupby('sub_knowledge'):
                # 跳过无效的子知识点
                if not sub_knowledge or sub_knowledge == 'undefined' or sub_knowledge == '未知':
                    continue
                    
                sub_timeline = []
                sub_cumulative_correct = 0
                sub_cumulative_total = 0
                
                for idx, row in sub_group.iterrows():
                    # 直接使用CSV中的Mastery字段
                    sub_mastery_level = float(row['Mastery']) if not pd.isnull(row['Mastery']) else 0.0
                    
                    sub_timeline.append({
                        'timestamp': int(row['time']),
                        'mastery_level': float(sub_mastery_level),  # 直接使用Mastery字段
                        'state': row['state'],
                        'score': float(row['score_x']) if not pd.isnull(row['score_x']) else 0
                    })
                
                # 只有当时间线有数据时才添加
                if sub_timeline:
                    sub_knowledge_data[sub_knowledge] = {
                        'timeline': sub_timeline
                    }
            
            # 只有当时间线有数据时才添加
            if knowledge_timeline:
                timeseries_data[knowledge] = {
                    'timeline': knowledge_timeline,
                    'sub_knowledge': sub_knowledge_data
                }
        
        return {
            'status': 'success',
            'student_id': student_id,
            'timeseries_data': timeseries_data
        }
    
    def analyze_learning_behavior(self, student_id=None):
        """分析学习行为模式
        
        Args:
            student_id: 学生ID，如果为None则分析所有学生
            
        Returns:
            学习行为模式分析结果
        """
        # 获取所有提交记录
        all_submissions = pd.DataFrame(self.data_service.get_all_submissions())
        if all_submissions.empty:
            return {'status': 'error', 'message': '没有找到提交记录数据'}
        
        # 如果指定了学生ID，则只分析该学生的数据
        if student_id:
            submissions = all_submissions[all_submissions['student_ID'] == student_id]
            if submissions.empty:
                return {'status': 'error', 'message': f'没有找到学生 {student_id} 的提交记录'}
            
            # 获取学生信息
            students = pd.DataFrame(self.data_service.get_students({'student_ID': student_id}))
            if students.empty:
                student_info = {'student_ID': student_id}
            else:
                student_info = students.iloc[0].to_dict()
        else:
            submissions = all_submissions
            student_info = None
        
        # 转换时间戳为datetime对象（转换为北京时间 UTC+8）
        submissions = submissions.copy()  # 创建副本以避免SettingWithCopyWarning
        submissions.loc[:, 'datetime'] = pd.to_datetime(submissions['time'], unit='s', utc=True)
        # 转换为北京时间（UTC+8）
        submissions.loc[:, 'datetime'] = submissions['datetime'].dt.tz_convert('Asia/Shanghai')
        
        # 提取时间特征
        submissions.loc[:, 'hour'] = submissions['datetime'].dt.hour
        submissions.loc[:, 'day'] = submissions['datetime'].dt.day
        submissions.loc[:, 'weekday'] = submissions['datetime'].dt.weekday
        
        # 分析答题高峰时段 - 生成完整的24小时分布
        hour_counts = submissions.groupby('hour').size().reset_index(name='count')
        
        # 确保包含所有24小时，没有提交的小时显示为0
        all_hours = pd.DataFrame({'hour': range(24)})
        hour_counts = all_hours.merge(hour_counts, on='hour', how='left').fillna(0)
        hour_counts['count'] = hour_counts['count'].astype(int)
        
        # 获取前3个高峰时段（用于兼容性）
        peak_hours = hour_counts.sort_values('count', ascending=False).head(3)
        
        # 分析答题状态分布
        state_counts = submissions.groupby('state').size().reset_index(name='count')
        state_distribution = {row['state']: row['count'] for _, row in state_counts.iterrows()}
        
        # 计算掌握程度（基于Mastery字段）
        if 'Mastery' in submissions.columns:
            # 使用Mastery字段计算平均掌握程度
            mastery_rate = submissions['Mastery'].mean()
        else:
            # 如果没有Mastery字段，回退到正确率计算
            correct_submissions = submissions[submissions['state'] == 'Absolutely_Correct']
            mastery_rate = len(correct_submissions) / len(submissions) if len(submissions) > 0 else 0
        
        # 分析平均答题时间
        # 处理异常值，如"--"或"-"等非数值
        submissions.loc[:, 'timeconsume'] = submissions['timeconsume'].replace(['--', '-'], np.nan).infer_objects(copy=False)
        submissions.loc[:, 'timeconsume'] = pd.to_numeric(submissions['timeconsume'], errors='coerce')
        avg_time_consume = submissions['timeconsume'].mean()
        
        # 分析内存使用情况
        avg_memory = submissions[submissions['memory'] > 0]['memory'].mean()
        
        # 分析使用的方法分布
        method_counts = submissions.groupby('method').size().reset_index(name='count')
        method_distribution = {row['method']: row['count'] for _, row in method_counts.iterrows()}
        
        # 构建学习行为画像
        behavior_profile = {
            'peak_hours': peak_hours.to_dict('records'),
            'hour_distribution': hour_counts.to_dict('records'),  # 完整的24小时分布
            'state_distribution': state_distribution,
            'correct_rate': mastery_rate,  # 使用掌握程度替代正确率
            'avg_time_consume': avg_time_consume,
            'avg_memory': avg_memory,
            'method_distribution': method_distribution,
            'total_submissions': len(submissions)
        }
        
        # 如果是分析单个学生，添加个性化分析
        if student_id:
            # 获取所有学生的掌握程度数据进行对比
            if 'Mastery' in all_submissions.columns:
                all_students_mastery_rate = all_submissions['Mastery'].mean()
            else:
                all_students_mastery_rate = len(all_submissions[all_submissions['state'] == 'Absolutely_Correct']) / len(all_submissions)
            
            # 处理所有学生的timeconsume数据中的异常值
            all_submissions_copy = all_submissions.copy()
            all_submissions_copy.loc[:, 'timeconsume'] = all_submissions_copy['timeconsume'].replace(['--', '-'], np.nan).infer_objects(copy=False)
            all_submissions_copy.loc[:, 'timeconsume'] = pd.to_numeric(all_submissions_copy['timeconsume'], errors='coerce')
            all_students_avg_time = all_submissions_copy['timeconsume'].mean()
            
            # 计算相对表现
            behavior_profile['relative_performance'] = {
                'correct_rate_vs_avg': mastery_rate - all_students_mastery_rate,
                'time_consume_vs_avg': avg_time_consume - all_students_avg_time
            }
            
            # 添加学生信息
            behavior_profile['student_info'] = student_info
        
        return {
            'status': 'success',
            'behavior_profile': behavior_profile,
            'student_info': student_info
        }
    
    def analyze_question_difficulty(self):
        """分析题目难度，识别不合理的题目
        
        Returns:
            题目难度分析结果
        """
        # 获取所有提交记录
        all_submissions = pd.DataFrame(self.data_service.get_all_submissions())
        if all_submissions.empty:
            return {'status': 'error', 'message': '没有找到提交记录数据'}
        
        # 获取题目信息
        questions = pd.DataFrame(self.data_service.get_questions())
        if questions.empty:
            return {'status': 'error', 'message': '没有找到题目数据'}
        
        # 获取学生信息
        students = pd.DataFrame(self.data_service.get_students())
        if students.empty:
            return {'status': 'error', 'message': '没有找到学生数据'}
        
        # 计算每个题目的难度指标
        question_difficulty = {}
        for title_id, group in all_submissions.groupby('title_ID'):
            # 计算该题目的提交次数和正确提交次数
            total_submissions = len(group)
            correct_submissions = len(group[group['state'] == 'Absolutely_Correct'])
            
            # 计算正确率
            correct_rate = correct_submissions / total_submissions if total_submissions > 0 else 0
            
            # 计算平均用时和平均内存使用
            group_copy = group.copy()
            group_copy.loc[:, 'timeconsume'] = group_copy['timeconsume'].replace(['--', '-'], np.nan).infer_objects(copy=False)
            group_copy.loc[:, 'timeconsume'] = pd.to_numeric(group_copy['timeconsume'], errors='coerce')
            avg_time_consume = group_copy['timeconsume'].mean()
            avg_memory = group[group['memory'] > 0]['memory'].mean()
            
            # 获取题目分数和知识点
            question_info = questions[questions['title_ID'] == title_id]
            if not question_info.empty:
                score = question_info.iloc[0]['score']
                knowledge = question_info.iloc[0]['knowledge']
                sub_knowledge = question_info.iloc[0]['sub_knowledge']
            else:
                score = 0
                knowledge = '未知'
                sub_knowledge = '未知'
            
            # 计算该题目的平均掌握程度
            # 获取所有做过这道题的学生的掌握程度
            title_mastery_levels = group['Mastery'].tolist()
            avg_mastery = np.mean(title_mastery_levels) if title_mastery_levels else 0
            
            # 存储题目难度信息
            question_difficulty[title_id] = {
                'title_id': title_id,
                'correct_rate': correct_rate,
                'avg_time_consume': avg_time_consume,
                'avg_memory': avg_memory,
                'total_submissions': total_submissions,
                'correct_submissions': correct_submissions,
                'score': score,
                'knowledge': knowledge,
                'sub_knowledge': sub_knowledge,
                'avg_mastery': avg_mastery
            }
        
        # 分析学生的知识掌握程度
        student_knowledge = {}
        for student_id, group in all_submissions.groupby('student_ID'):
            # 合并提交记录和题目信息
            student_submissions = pd.merge(group, questions, on='title_ID', how='left')
            
            # 按知识点分组计算掌握程度（使用已计算的Mastery列的平均值）
            knowledge_mastery = {}
            for knowledge, k_group in student_submissions.groupby('knowledge'):
                # 使用已计算好的Mastery列的平均值作为知识点掌握程度
                mastery = k_group['Mastery'].mean() if not k_group['Mastery'].empty else 0
                knowledge_mastery[knowledge] = mastery
            
            student_knowledge[student_id] = knowledge_mastery
        
        # 识别不合理的题目
        unreasonable_questions = []
        for title_id, difficulty in question_difficulty.items():
            if difficulty['correct_rate'] < 0.3:  # 正确率低于30%
                # 检查做这道题的学生在相关知识点上的平均掌握程度
                knowledge = difficulty['knowledge']
                students_attempted = all_submissions[all_submissions['title_ID'] == title_id]['student_ID'].unique()
                
                # 计算这些学生在该知识点上的平均掌握程度
                knowledge_mastery_levels = []
                for student_id in students_attempted:
                    if student_id in student_knowledge and knowledge in student_knowledge[student_id]:
                        knowledge_mastery_levels.append(student_knowledge[student_id][knowledge])
                
                avg_mastery = np.mean(knowledge_mastery_levels) if knowledge_mastery_levels else 0
                
                # 如果学生知识掌握程度高但题目正确率低，则认为题目难度不合理
                if avg_mastery > 0.37 and difficulty['correct_rate'] < 0.22:
                    unreasonable_questions.append({
                        'title_id': title_id,
                        'correct_rate': difficulty['correct_rate'],
                        'avg_mastery': avg_mastery,
                        'knowledge': knowledge,
                        'sub_knowledge': difficulty['sub_knowledge'],
                        'score': difficulty['score'],
                        'reason': '学生知识掌握程度高但题目正确率低'
                    })
        
        return {
            'status': 'success',
            'question_difficulty': question_difficulty,
            'unreasonable_questions': unreasonable_questions
        }
        """生成掌握程度分析结果文件
        
        Args:
            student_id: 学生ID，如果为None则分析所有学生
            file_types: 要生成的文件类型列表，如果为None则生成所有类型
                      可选值：['student_title', 'student_subknowledge', 'student_knowledge',
                             'title', 'subknowledge', 'knowledge']
        
        Returns:
            dict: 包含生成文件的状态和路径
        """
        try:
            print("开始生成掌握程度分析文件...")
            
            # 创建Result文件夹（如果不存在）
            result_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../Data/Analysis_Results')
            print(f"Result目录路径: {result_dir}")
            if not os.path.exists(result_dir):
                try:
                    os.makedirs(result_dir)
                    print("创建Result目录")
                except Exception as e:
                    print(f"创建Result目录失败: {str(e)}")
                    return {
                        'status': 'error',
                        'message': f'创建Result目录失败: {str(e)}'
                    }
            
            # 获取所有提交记录和题目信息
            print("获取提交记录和题目信息...")
            all_submissions = pd.DataFrame(self.data_service.get_all_submissions())
            questions = pd.DataFrame(self.data_service.get_questions())
            
            print(f"获取到 {len(all_submissions)} 条提交记录")
            print(f"获取到 {len(questions)} 条题目信息")
            
            if all_submissions.empty or questions.empty:
                print("错误：没有找到必要的数据")
                return {
                    'status': 'error',
                    'message': '没有找到必要的数据'
                }
            
            # 如果指定了学生ID，则只分析该学生的数据
            if student_id:
                all_submissions = all_submissions[all_submissions['student_ID'] == student_id]
                if all_submissions.empty:
                    return {
                        'status': 'error',
                        'message': f'没有找到学生 {student_id} 的提交记录'
                    }
            
            # 合并提交记录和题目信息
            print("合并提交记录和题目信息...")
            merged_data = pd.merge(all_submissions, questions, on='title_ID', how='left')
            print(f"合并后的数据条数: {len(merged_data)}")
            
            # 处理时间数据
            merged_data['timeconsume'] = pd.to_numeric(merged_data['timeconsume'].replace(['--', '-'], np.nan), errors='coerce')
            
            # 定义要生成的文件类型
            if file_types is None:
                file_types = ['student_title', 'student_subknowledge', 'student_knowledge',
                            'title', 'subknowledge', 'knowledge']
            
            generated_files = []
            
            # 生成每个学生对每个题目的掌握程度
            if 'student_title' in file_types:
                try:
                    print("生成每个学生对每个题目的掌握程度...")
                    student_title_mastery = []
                    for student_id, group in merged_data.groupby('student_ID'):
                        for title_id, title_group in group.groupby('title_ID'):
                            # 计算该题目的掌握程度
                            total_score = 0
                            earned_score = 0
                            time_consumes = []
                            for _, submission in title_group.iterrows():
                                if submission['state'] == 'Absolutely_Correct':
                                    total_score += 3
                                    earned_score += 3
                                elif submission['state'] == 'Partially_Correct':
                                    total_score += 3
                                    earned_score += submission['score_x']
                                else:
                                    total_score += 3
                                if not pd.isna(submission['timeconsume']):
                                    time_consumes.append(submission['timeconsume'])
                            
                            mastery = earned_score / total_score if total_score > 0 else 0
                            avg_time = np.mean(time_consumes) if time_consumes else None
                            
                            student_title_mastery.append({
                                'Student_ID': student_id,
                                'ID': title_id,
                                'Mastery': mastery,
                                'Avg_Time': avg_time,
                                'Submission_Count': len(title_group)
                            })
                    
                    print(f"生成了 {len(student_title_mastery)} 条题目掌握程度记录")
                    file_path = os.path.join(result_dir, 'student_title_mastery.csv')
                    pd.DataFrame(student_title_mastery).to_csv(file_path, index=False, encoding='utf-8')
                    generated_files.append('student_title_mastery.csv')
                except Exception as e:
                    print(f"生成学生题目掌握程度文件时出错: {str(e)}")
                    pass
            
            # 生成每个学生对每个子知识点的掌握程度
            if 'student_subknowledge' in file_types:
                try:
                    print("生成每个学生对每个子知识点的掌握程度...")
                    student_subknowledge_mastery = []
                    for student_id, group in merged_data.groupby('student_ID'):
                        for sub_knowledge, sub_group in group.groupby('sub_knowledge'):
                            total_score = 0
                            earned_score = 0
                            time_consumes = []
                            for _, submission in sub_group.iterrows():
                                if submission['state'] == 'Absolutely_Correct':
                                    total_score += 3
                                    earned_score += 3
                                elif submission['state'] == 'Partially_Correct':
                                    total_score += 3
                                    earned_score += submission['score_x']
                                else:
                                    total_score += 3
                                if not pd.isna(submission['timeconsume']):
                                    time_consumes.append(submission['timeconsume'])
                            
                            mastery = earned_score / total_score if total_score > 0 else 0
                            avg_time = np.mean(time_consumes) if time_consumes else None
                            
                            student_subknowledge_mastery.append({
                                'Student_ID': student_id,
                                'ID': sub_knowledge,
                                'Mastery': mastery,
                                'Avg_Time': avg_time,
                                'Submission_Count': len(sub_group),
                                'Question_Count': len(sub_group['title_ID'].unique())
                            })
                    
                    print(f"生成了 {len(student_subknowledge_mastery)} 条子知识点掌握程度记录")
                    file_path = os.path.join(result_dir, 'student_subknowledge_mastery.csv')
                    pd.DataFrame(student_subknowledge_mastery).to_csv(file_path, index=False, encoding='utf-8')
                    generated_files.append('student_subknowledge_mastery.csv')
                except Exception as e:
                    print(f"生成学生子知识点掌握程度文件时出错: {str(e)}")
                    pass
            
            # 生成每个学生对每个知识点的掌握程度
            if 'student_knowledge' in file_types:
                try:
                    print("生成每个学生对每个知识点的掌握程度...")
                    student_knowledge_mastery = []
                    for student_id, group in merged_data.groupby('student_ID'):
                        for knowledge, k_group in group.groupby('knowledge'):
                            # 获取该知识点下的所有子知识点
                            sub_knowledges = k_group['sub_knowledge'].unique()
                            
                            # 计算每个子知识点的权重（基于题目数量）
                            sub_knowledge_weights = {}
                            total_questions = 0
                            for sub_k in sub_knowledges:
                                sub_questions = len(k_group[k_group['sub_knowledge'] == sub_k]['title_ID'].unique())
                                sub_knowledge_weights[sub_k] = sub_questions
                                total_questions += sub_questions
                            
                            # 计算加权掌握程度
                            weighted_mastery = 0
                            total_weight = 0
                            time_consumes = []
                            
                            for sub_k, sub_group in k_group.groupby('sub_knowledge'):
                                weight = sub_knowledge_weights[sub_k] / total_questions if total_questions > 0 else 0
                                total_score = 0
                                earned_score = 0
                                
                                for _, submission in sub_group.iterrows():
                                    if submission['state'] == 'Absolutely_Correct':
                                        total_score += 3
                                        earned_score += 3
                                    elif submission['state'] == 'Partially_Correct':
                                        total_score += 3
                                        earned_score += submission['score_x']
                                    else:
                                        total_score += 3
                                    if not pd.isna(submission['timeconsume']):
                                        time_consumes.append(submission['timeconsume'])
                                
                                sub_mastery = earned_score / total_score if total_score > 0 else 0
                                weighted_mastery += sub_mastery * weight
                                total_weight += weight
                            
                            mastery = weighted_mastery / total_weight if total_weight > 0 else 0
                            avg_time = np.mean(time_consumes) if time_consumes else None
                            
                            student_knowledge_mastery.append({
                                'Student_ID': student_id,
                                'ID': knowledge,
                                'Mastery': mastery,
                                'Avg_Time': avg_time,
                                'Submission_Count': len(k_group),
                                'Question_Count': len(k_group['title_ID'].unique()),
                                'Sub_Knowledge_Count': len(sub_knowledges)
                            })
                    
                    print(f"生成了 {len(student_knowledge_mastery)} 条知识点掌握程度记录")
                    file_path = os.path.join(result_dir, 'student_knowledge_mastery.csv')
                    pd.DataFrame(student_knowledge_mastery).to_csv(file_path, index=False, encoding='utf-8')
                    generated_files.append('student_knowledge_mastery.csv')
                except Exception as e:
                    print(f"生成学生知识点掌握程度文件时出错: {str(e)}")
                    pass
            
            # 生成学生整体对每个题目的掌握程度
            if 'title' in file_types:
                try:
                    print("生成学生整体对每个题目的掌握程度...")
                    title_mastery = []
                    for title_id, group in merged_data.groupby('title_ID'):
                        total_score = 0
                        earned_score = 0
                        time_consumes = []
                        for _, submission in group.iterrows():
                            if submission['state'] == 'Absolutely_Correct':
                                total_score += 3
                                earned_score += 3
                            elif submission['state'] == 'Partially_Correct':
                                total_score += 3
                                earned_score += submission['score_x']
                            else:
                                total_score += 3
                            if not pd.isna(submission['timeconsume']):
                                time_consumes.append(submission['timeconsume'])
                        
                        mastery = earned_score / total_score if total_score > 0 else 0
                        avg_time = np.mean(time_consumes) if time_consumes else None
                        
                        title_mastery.append({
                            'ID': title_id,
                            'Mastery': mastery,
                            'Avg_Time': avg_time,
                            'Submission_Count': len(group),
                            'Student_Count': len(group['student_ID'].unique())
                        })
                    
                    print(f"生成了 {len(title_mastery)} 条整体题目掌握程度记录")
                    file_path = os.path.join(result_dir, 'title_mastery.csv')
                    pd.DataFrame(title_mastery).to_csv(file_path, index=False, encoding='utf-8')
                    generated_files.append('title_mastery.csv')
                except Exception as e:
                    print(f"生成整体题目掌握程度文件时出错: {str(e)}")
                    pass
            
            # 生成学生整体对每个子知识点的掌握程度
            if 'subknowledge' in file_types:
                try:
                    print("生成学生整体对每个子知识点的掌握程度...")
                    subknowledge_mastery = []
                    for sub_knowledge, group in merged_data.groupby('sub_knowledge'):
                        total_score = 0
                        earned_score = 0
                        time_consumes = []
                        for _, submission in group.iterrows():
                            if submission['state'] == 'Absolutely_Correct':
                                total_score += 3
                                earned_score += 3
                            elif submission['state'] == 'Partially_Correct':
                                total_score += 3
                                earned_score += submission['score_x']
                            else:
                                total_score += 3
                            if not pd.isna(submission['timeconsume']):
                                time_consumes.append(submission['timeconsume'])
                        
                        mastery = earned_score / total_score if total_score > 0 else 0
                        avg_time = np.mean(time_consumes) if time_consumes else None
                        
                        subknowledge_mastery.append({
                            'ID': sub_knowledge,
                            'Mastery': mastery,
                            'Avg_Time': avg_time,
                            'Submission_Count': len(group),
                            'Question_Count': len(group['title_ID'].unique()),
                            'Student_Count': len(group['student_ID'].unique())
                        })
                    
                    print(f"生成了 {len(subknowledge_mastery)} 条整体子知识点掌握程度记录")
                    file_path = os.path.join(result_dir, 'subknowledge_mastery.csv')
                    pd.DataFrame(subknowledge_mastery).to_csv(file_path, index=False, encoding='utf-8')
                    generated_files.append('subknowledge_mastery.csv')
                except Exception as e:
                    print(f"生成整体子知识点掌握程度文件时出错: {str(e)}")
                    pass
            
            # 生成学生整体对每个知识点的掌握程度
            if 'knowledge' in file_types:
                try:
                    print("生成学生整体对每个知识点的掌握程度...")
                    knowledge_mastery = []
                    for knowledge, k_group in merged_data.groupby('knowledge'):
                        # 获取该知识点下的所有子知识点
                        sub_knowledges = k_group['sub_knowledge'].unique()
                        
                        # 计算每个子知识点的权重（基于题目数量）
                        sub_knowledge_weights = {}
                        total_questions = 0
                        for sub_k in sub_knowledges:
                            sub_questions = len(k_group[k_group['sub_knowledge'] == sub_k]['title_ID'].unique())
                            sub_knowledge_weights[sub_k] = sub_questions
                            total_questions += sub_questions
                        
                        # 计算加权掌握程度
                        weighted_mastery = 0
                        total_weight = 0
                        time_consumes = []
                        
                        for sub_k, sub_group in k_group.groupby('sub_knowledge'):
                            weight = sub_knowledge_weights[sub_k] / total_questions if total_questions > 0 else 0
                            total_score = 0
                            earned_score = 0
                            
                            for _, submission in sub_group.iterrows():
                                if submission['state'] == 'Absolutely_Correct':
                                    total_score += 3
                                    earned_score += 3
                                elif submission['state'] == 'Partially_Correct':
                                    total_score += 3
                                    earned_score += submission['score_x']
                                else:
                                    total_score += 3
                                if not pd.isna(submission['timeconsume']):
                                    time_consumes.append(submission['timeconsume'])
                            
                            sub_mastery = earned_score / total_score if total_score > 0 else 0
                            weighted_mastery += sub_mastery * weight
                            total_weight += weight
                        
                        mastery = weighted_mastery / total_weight if total_weight > 0 else 0
                        avg_time = np.mean(time_consumes) if time_consumes else None
                        
                        knowledge_mastery.append({
                            'ID': knowledge,
                            'Mastery': mastery,
                            'Avg_Time': avg_time,
                            'Submission_Count': len(k_group),
                            'Question_Count': len(k_group['title_ID'].unique()),
                            'Student_Count': len(k_group['student_ID'].unique()),
                            'Sub_Knowledge_Count': len(sub_knowledges)
                        })
                    
                    print(f"生成了 {len(knowledge_mastery)} 条整体知识点掌握程度记录")
                    file_path = os.path.join(result_dir, 'knowledge_mastery.csv')
                    pd.DataFrame(knowledge_mastery).to_csv(file_path, index=False, encoding='utf-8')
                    generated_files.append('knowledge_mastery.csv')
                except Exception as e:
                    print(f"生成整体知识点掌握程度文件时出错: {str(e)}")
                    pass
            
            print("所有文件已保存")
            
            return {
                'status': 'success',
                'data': {
                    'generated_files': generated_files,
                    'total_files': len(generated_files)
                },
                'metadata': {
                    'student_id': student_id,
                    'file_types': file_types,
                    'result_dir': result_dir
                }
            }
            
        except Exception as e:
            print(f"发生错误: {str(e)}")
            print("错误详情:")
            print(traceback.format_exc())
            return {
                'status': 'error',
                'message': f'生成文件时发生错误: {str(e)}'
            }