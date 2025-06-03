# 分析服务模块 - 负责数据分析和可视化数据生成

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from services.data_service import DataService

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
            # 计算该知识点的总分和获得的分数
            total_score = group['score_y'].sum()  # 题目总分
            earned_score = group['score_x'].sum()  # 获得的分数
            
            # 计算正确率
            correct_rate = earned_score / total_score if total_score > 0 else 0
            
            # 计算该知识点的提交次数和正确提交次数
            total_submissions = len(group)
            correct_submissions = len(group[group['state'] == 'Absolutely_Correct'])
            
            # 计算正确提交率
            correct_submission_rate = correct_submissions / total_submissions if total_submissions > 0 else 0
            
            # 计算平均用时
            group = group.copy()  # 创建副本以避免SettingWithCopyWarning
            # 处理异常值，如"--"或"-"等非数值
            group['timeconsume'] = pd.to_numeric(group['timeconsume'].replace(['--', '-'], np.nan), errors='coerce')
            avg_time_consume = group['timeconsume'].mean()
            
            # 存储该知识点的掌握情况
            knowledge_mastery[knowledge] = {
                'correct_rate': float(correct_rate),
                'correct_submission_rate': float(correct_submission_rate),
                'avg_time_consume': float(avg_time_consume),
                'total_submissions': int(total_submissions),
                'correct_submissions': int(correct_submissions),
                'total_score': float(total_score),
                'earned_score': float(earned_score)
            }
            
            # 分析该知识点的从属知识点掌握情况
            sub_knowledge_mastery = {}
            for sub_knowledge, sub_group in group.groupby('sub_knowledge'):
                sub_total_score = sub_group['score_y'].sum()
                sub_earned_score = sub_group['score_x'].sum()
                sub_correct_rate = sub_earned_score / sub_total_score if sub_total_score > 0 else 0
                
                sub_total_submissions = len(sub_group)
                sub_correct_submissions = len(sub_group[sub_group['state'] == 'Absolutely_Correct'])
                sub_correct_submission_rate = sub_correct_submissions / sub_total_submissions if sub_total_submissions > 0 else 0
                
                # 处理异常值，如"--"或"-"等非数值
                sub_group = sub_group.copy()  # 创建副本以避免SettingWithCopyWarning
                sub_group['timeconsume'] = pd.to_numeric(sub_group['timeconsume'].replace(['--', '-'], np.nan), errors='coerce')
                sub_avg_time_consume = sub_group['timeconsume'].mean()
                
                sub_knowledge_mastery[sub_knowledge] = {
                    'correct_rate': float(sub_correct_rate),
                    'correct_submission_rate': float(sub_correct_submission_rate),
                    'avg_time_consume': float(sub_avg_time_consume),
                    'total_submissions': int(sub_total_submissions),
                    'correct_submissions': int(sub_correct_submissions),
                    'total_score': float(sub_total_score),
                    'earned_score': float(sub_earned_score)
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
        
        return {
            'status': 'success',
            'student_id': student_id,
            'knowledge_mastery': knowledge_mastery,
            'weak_points': weak_points
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
        
        # 转换时间戳为datetime对象
        submissions = submissions.copy()  # 创建副本以避免SettingWithCopyWarning
        submissions['datetime'] = pd.to_datetime(submissions['time'], unit='s')
        
        # 提取时间特征
        submissions['hour'] = submissions['datetime'].dt.hour
        submissions['day'] = submissions['datetime'].dt.day
        submissions['weekday'] = submissions['datetime'].dt.weekday
        
        # 分析答题高峰时段
        hour_counts = submissions.groupby('hour').size().reset_index(name='count')
        peak_hours = hour_counts.sort_values('count', ascending=False).head(3)
        
        # 分析答题状态分布
        state_counts = submissions.groupby('state').size().reset_index(name='count')
        state_distribution = {row['state']: row['count'] for _, row in state_counts.iterrows()}
        
        # 计算正确答题率
        correct_submissions = submissions[submissions['state'] == 'Absolutely_Correct']
        correct_rate = len(correct_submissions) / len(submissions) if len(submissions) > 0 else 0
        
        # 分析平均答题时间
        # 处理异常值，如"--"或"-"等非数值
        submissions['timeconsume'] = pd.to_numeric(submissions['timeconsume'].replace(['--', '-'], np.nan), errors='coerce')
        avg_time_consume = submissions['timeconsume'].mean()
        
        # 分析内存使用情况
        avg_memory = submissions[submissions['memory'] > 0]['memory'].mean()
        
        # 分析使用的方法分布
        method_counts = submissions.groupby('method').size().reset_index(name='count')
        method_distribution = {row['method']: row['count'] for _, row in method_counts.iterrows()}
        
        # 构建学习行为画像
        behavior_profile = {
            'peak_hours': peak_hours.to_dict('records'),
            'state_distribution': state_distribution,
            'correct_rate': correct_rate,
            'avg_time_consume': avg_time_consume,
            'avg_memory': avg_memory,
            'method_distribution': method_distribution,
            'total_submissions': len(submissions)
        }
        
        # 如果是分析单个学生，添加个性化分析
        if student_id:
            # 获取所有学生的数据进行对比
            all_students_correct_rate = len(all_submissions[all_submissions['state'] == 'Absolutely_Correct']) / len(all_submissions)
            
            # 处理所有学生的timeconsume数据中的异常值
            all_submissions_copy = all_submissions.copy()
            all_submissions_copy['timeconsume'] = pd.to_numeric(all_submissions_copy['timeconsume'].replace(['--', '-'], np.nan), errors='coerce')
            all_students_avg_time = all_submissions_copy['timeconsume'].mean()
            
            # 计算相对表现
            behavior_profile['relative_performance'] = {
                'correct_rate_vs_avg': correct_rate - all_students_correct_rate,
                'time_consume_vs_avg': avg_time_consume - all_students_avg_time
            }
            
            # 添加学生信息
            behavior_profile['student_info'] = student_info
        
        return {
            'status': 'success',
            'student_id': student_id,
            'behavior_profile': behavior_profile
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
            
            # 根据不同状态计算得分
            total_score = 0
            for _, submission in group.iterrows():
                if submission['state'] == 'Absolutely_Correct':
                    total_score += 3 
                elif submission['state'] == 'Partially_Correct':
                    total_score += submission['score']
            
            # 计算平均得分率（总分/最大可能分数）
            max_possible_score = total_submissions * 3 
            correct_rate = total_score / max_possible_score if max_possible_score > 0 else 0
            
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
            
            # 存储题目难度信息
            question_difficulty[title_id] = {
                'title_id': title_id,
                'correct_rate': correct_rate,
                'avg_time_consume': avg_time_consume,
                'avg_memory': avg_memory,
                'total_submissions': total_submissions,
                'total_score': total_score,
            }

        # 分析学生的知识掌握程度
        student_knowledge = {}
        for student_id, group in all_submissions.groupby('student_ID'):
            # 合并提交记录和题目信息
            student_submissions = pd.merge(group, questions, on='title_ID', how='left')
            
            # 按知识点分组计算掌握程度
            knowledge_mastery = {}
            for knowledge, k_group in student_submissions.groupby('knowledge'):
                total_score = k_group['score_y'].sum()
                earned_score = k_group['score_x'].sum()
                mastery = earned_score / total_score if total_score > 0 else 0
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
                if avg_mastery > 0.7 and difficulty['correct_rate'] < 0.3:
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
    def detect_learning_status(self, correct_rate, time_score, memory_score, high_thr=0.85, low_thr=0.5, good_thr=0.7):
        """返回可叠加的学习情况标签列表，水平标签有：差、一般、良好、优秀。支持用时、内存分位加权。
        """
        final_score = 0.7 * correct_rate + 0.15 * time_score + 0.15 * memory_score
        if final_score >= high_thr:
            tag = ['优秀']
        elif final_score >= good_thr:
            tag = ['良好']
        elif final_score >= low_thr:
            tag = ['一般']
        else:
            tag = ['差']
        return final_score, tag

    def detect_learning_trend(self, prev_score, curr_score, progress_thr=0.15, decline_thr=0.1):
        """返回进步/退步标签，基于前后两个加权分数的变化"""
        tags = []
        diff = curr_score - prev_score
        if diff > progress_thr:
            tags.append('进步')
        elif diff < -decline_thr:
            tags.append('退步')
        return tags     

    def analyze_mastery_trend(self, student_id=None, granularity='day', group_by='knowledge'):
        """分析对相同题目、相同子知识点、相同知识点的掌握程度变化趋势，并检测学习情况"""
        # 获取所有提交记录
        all_submissions = pd.DataFrame(self.data_service.get_all_submissions())
        if all_submissions.empty:
            return {'status': 'error', 'message': '没有找到提交记录数据'}
        # 获取题目信息
        questions = pd.DataFrame(self.data_service.get_questions())
        if questions.empty:
            return {'status': 'error', 'message': '没有找到题目数据'}
        # 过滤学生
        if student_id:
            submissions = all_submissions[all_submissions['student_ID'] == student_id]
            if submissions.empty:
                return {'status': 'error', 'message': f'没有找到学生 {student_id} 的提交记录'}
        else:
            submissions = all_submissions
        # 合并题目信息
        merged = pd.merge(submissions, questions, on='title_ID', how='left')
        # 处理时间
        merged = merged.copy()
        merged.loc[:, 'datetime'] = pd.to_datetime(merged['time'], unit='s')
        # 处理异常值
        merged['timeconsume'] = pd.to_numeric(merged['timeconsume'].replace(['--', '-'], np.nan), errors='coerce')
        merged.loc[:, 'score_x'] = pd.to_numeric(merged['score_x'], errors='coerce')
        # 时间分组
        if granularity == 'day':
            merged['time_group'] = merged['datetime'].dt.date
        elif granularity == 'week':
            merged['time_group'] = merged['datetime'].dt.strftime('%Y-W%U')
        elif granularity == 'month':
            merged['time_group'] = merged['datetime'].dt.strftime('%Y-%m')
        elif granularity == 'submission':
            merged = merged.sort_values('datetime')
            merged['time_group'] = range(1, len(merged) + 1)
        else:
            return {'status': 'error', 'message': '不支持的时间粒度'}
        
        
        # 统计函数
        def calc_trend(df):
            avg_res = self.analyze_avg_practice_curve(group_by=group_by)
            avg_curve = avg_res['avg_curve_by_%s' % group_by]
            avg_time_curve = avg_res['avg_time_curve_by_%s' % group_by]
            avg_memory_curve = avg_res['avg_memory_curve_by_%s' % group_by]
            trend = {}
            for key, group in df.groupby(group_by):
                group_trend = []
                scores = []
                counts = 0
                for tg, tg_group in group.groupby('time_group'):
                    total = len(tg_group)
                    correct = len(tg_group[tg_group['state'] == 'Absolutely_Correct'])
                    correct_rate = correct / total if total > 0 else 0
                    time_costs = tg_group['timeconsume'].tolist()
                    memory_costs = tg_group['memory'].tolist()
                    avg_time = float(np.nanmean(time_costs)) if time_costs else None
                    avg_memory = float(np.nanmean(memory_costs)) if memory_costs else None
                    # 计算与平均用时曲线的对比得分
                    avg_time_curve_val = float(np.nanmean([avg_time_curve[key][counts - 1 + i] for i in range(total)])) 
                    time_score = 1 - avg_time / avg_time_curve_val
                    # 计算与平均内存曲线的对比得分
                    avg_memory_curve_val = float(np.nanmean([avg_memory_curve[key][counts - 1 + i] for i in range(total)])) 
                    memory_score = 1 - avg_memory / avg_memory_curve_val
                    cur_score, point_learning_status = self.detect_learning_status(correct_rate, time_score, memory_score)
                    if len(scores) > 1:
                        point_learning_trend = self.detect_learning_trend(scores[-1], cur_score)
                    else:
                        point_learning_trend = []

                    group_trend.append({    
                        'time': str(tg),
                        'learning_status': point_learning_status,
                        'learning_trend': point_learning_trend
                    })
                    counts += total
                    scores.append(cur_score)
                trend[key] = {
                    'trend': group_trend,
                }
            return trend
        
        group_result = calc_trend(merged)
        
        return {
            'status': 'success',
            'student_id': student_id,
            'granularity': granularity,
            'trend_by_%s' % group_by: group_result
        }

    def analyze_avg_practice_curve(self, student_id=None, group_by='title_ID'):
        """计算每道题/知识点/子知识点平均每个学生第x次练习的正确率曲线、耗时曲线和内存曲线（正确率按状态得分）"""
        # 获取所有提交记录
        all_submissions = pd.DataFrame(self.data_service.get_all_submissions())
        if all_submissions.empty:
            return {'status': 'error', 'message': '没有找到提交记录数据'}
        # 获取题目信息
        questions = pd.DataFrame(self.data_service.get_questions())
        if questions.empty:
            return {'status': 'error', 'message': '没有找到题目数据'}
        # 过滤学生
        if student_id:
            submissions = all_submissions[all_submissions['student_ID'] == student_id]
            if submissions.empty:
                return {'status': 'error', 'message': f'没有找到学生 {student_id} 的提交记录'}
        else:
            submissions = all_submissions
        # 合并题目信息
        merged = pd.merge(submissions, questions, on='title_ID', how='left')
        merged = merged.copy()
        merged['timeconsume'] = pd.to_numeric(merged['timeconsume'].replace(['--', '-'], np.nan), errors='coerce')
        merged['memory'] = pd.to_numeric(merged['memory'].replace(['--', '-'], np.nan), errors='coerce')
        merged['score_x'] = pd.to_numeric(merged['score_x'], errors='coerce')
        merged.loc[:, 'datetime'] = pd.to_datetime(merged['time'], unit='s')
       
        result = {}
        
        group_result = {}
        time_curve_result = {}
        memory_curve_result = {}
        for group_value, group_df in merged.groupby(group_by):
            # 对每个学生，统计其第x次练习的正确率、耗时和内存
            student_curves = []
            student_time_curves = []
            student_memory_curves = []
            for student_id, stu_df in group_df.groupby('student_ID'):
                stu_df = stu_df.sort_values('datetime')
                # 正确率按状态得分
                def get_score(row):
                    if row['state'] == 'Absolutely_Correct':
                        return 1.0
                    elif row['state'] == 'Partially_Correct':
                        return float(row['score_x']) / 3 if not pd.isnull(row['score_x']) else 0.0
                    else:
                        return 0.0
                corrects = [get_score(row) for _, row in stu_df.iterrows()]
                times = stu_df['timeconsume'].tolist()
                memories = stu_df['memory'].tolist()
                student_curves.append(corrects)
                student_time_curves.append(times)
                student_memory_curves.append(memories)
            if not student_curves:
                continue
            max_len = max(len(curve) for curve in student_curves)
            avg_curve = []
            avg_time_curve = []
            avg_memory_curve = []
            for i in range(max_len):
                vals = [curve[i] for curve in student_curves if len(curve) > i]
                time_vals = [curve[i] for curve in student_time_curves if len(curve) > i]
                memory_vals = [curve[i] for curve in student_memory_curves if len(curve) > i]
                avg_curve.append(float(np.mean(vals)) if vals else None)
                avg_time_curve.append(float(np.nanmean(time_vals)) if time_vals else None)
                avg_memory_curve.append(float(np.nanmean(memory_vals)) if memory_vals else None)
            group_result[group_value] = avg_curve
            time_curve_result[group_value] = avg_time_curve
            memory_curve_result[group_value] = avg_memory_curve
        result['avg_curve_by_%s' % group_by] = group_result
        result['avg_time_curve_by_%s' % group_by] = time_curve_result
        result['avg_memory_curve_by_%s' % group_by] = memory_curve_result
        result['status'] = 'success'
        return result