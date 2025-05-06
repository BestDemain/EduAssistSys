# 自然语言处理服务模块 - 负责处理自然语言查询

import re
import json
import numpy as np
from services.data_service import DataService
from services.analysis_service import AnalysisService
from services.report_service import ReportService

class NLPService:
    def __init__(self):
        self.data_service = DataService()
        self.analysis_service = AnalysisService()
        self.report_service = ReportService()
        
        # 定义关键词和对应的处理函数
        self.keywords = {
            '知识点': self._process_knowledge_query,
            '掌握': self._process_knowledge_query,
            '学习行为': self._process_behavior_query,
            '行为模式': self._process_behavior_query,
            '题目难度': self._process_difficulty_query,
            '不合理': self._process_difficulty_query,
            '生成报告': self._process_report_query,
            '报告': self._process_report_query
        }
    
    def process_query(self, query):
        """处理自然语言查询
        
        Args:
            query: 用户的自然语言查询
            
        Returns:
            查询结果
        """
        # 提取查询中的学生ID
        student_id = self._extract_student_id(query)
        
        # 提取查询中的报告类型
        report_type = self._extract_report_type(query)
        
        # 提取查询中的报告格式
        format_type = self._extract_format_type(query)
        
        # 根据关键词确定处理函数
        for keyword, process_func in self.keywords.items():
            if keyword in query:
                return process_func(query, student_id, report_type, format_type)
        
        # 如果没有匹配的关键词，返回默认回复
        return {
            'status': 'success',
            'type': 'text',
            'content': '您好，我可以帮您分析知识点掌握情况、学习行为模式和题目难度，也可以生成分析报告。请告诉我您需要什么帮助？'
        }
    
    def _extract_student_id(self, query):
        """从查询中提取学生ID"""
        # 使用正则表达式匹配学生ID格式
        student_id_pattern = r'学生\s*[ID|id|Id]?\s*[:|：]?\s*([a-zA-Z0-9]+)'
        student_id_match = re.search(student_id_pattern, query)
        
        if student_id_match:
            return student_id_match.group(1)
        
        # 尝试匹配其他可能的表达方式
        alt_pattern = r'([a-f0-9]{20})'
        alt_match = re.search(alt_pattern, query)
        
        if alt_match:
            return alt_match.group(1)
        
        return None
    
    def _extract_report_type(self, query):
        """从查询中提取报告类型"""
        if '知识点' in query or '掌握' in query:
            return 'knowledge'
        elif '学习行为' in query or '行为模式' in query:
            return 'behavior'
        elif '题目难度' in query or '不合理' in query:
            return 'difficulty'
        else:
            return 'general'
    
    def _extract_format_type(self, query):
        """从查询中提取报告格式"""
        if 'PDF' in query or 'pdf' in query:
            return 'pdf'
        elif 'HTML' in query or 'html' in query:
            return 'html'
        elif 'Word' in query or 'word' in query or 'DOCX' in query or 'docx' in query:
            return 'docx'
        elif 'Excel' in query or 'excel' in query or 'XLSX' in query or 'xlsx' in query:
            return 'xlsx'
        else:
            return 'pdf'  # 默认为PDF格式
    
    def _process_knowledge_query(self, query, student_id=None, report_type=None, format_type=None):
        """处理知识点掌握相关的查询"""
        # 分析知识点掌握情况
        analysis_result = self.analysis_service.analyze_knowledge_mastery(student_id)
        
        if analysis_result['status'] != 'success':
            return {
                'status': 'error',
                'message': analysis_result['message']
            }
        
        # 如果查询中包含生成报告的请求
        if '报告' in query or '生成' in query:
            report_path = self.report_service.generate_report(
                report_type='knowledge',
                student_id=student_id,
                format_type=format_type
            )
            
            return {
                'status': 'success',
                'type': 'report',
                'report_path': report_path,
                'message': f'已生成知识点掌握度分析报告，格式为{format_type}'
            }
        
        # 构建回复内容
        response_content = '知识点掌握情况分析结果：\n'
        
        # 添加学生信息
        if student_id:
            response_content += f'学生ID: {student_id}\n'
        
        # 添加知识点掌握情况
        for knowledge, data in analysis_result['knowledge_mastery'].items():
            response_content += f"\n知识点 '{knowledge}':\n"
            response_content += f"  - 正确率: {data['correct_rate']:.2%}\n"
            response_content += f"  - 正确提交率: {data['correct_submission_rate']:.2%}\n"
            response_content += f"  - 平均用时: {data['avg_time_consume']:.2f}秒\n"
        
        # 添加薄弱环节分析
        if analysis_result['weak_points']:
            response_content += '\n薄弱环节分析：\n'
            for weak_point in analysis_result['weak_points']:
                text = f"  - 知识点 '{weak_point['knowledge']}' "
                if 'sub_knowledge' in weak_point:
                    text += f"的从属知识点 '{weak_point['sub_knowledge']}' "
                text += f"正确率为 {weak_point['correct_rate']:.2%}，{weak_point['reason']}。\n"
                response_content += text
        
        return {
            'status': 'success',
            'type': 'text',
            'content': response_content
        }
    
    def _process_behavior_query(self, query, student_id=None, report_type=None, format_type=None):
        """处理学习行为相关的查询"""
        # 分析学习行为
        analysis_result = self.analysis_service.analyze_learning_behavior(student_id)
        
        if analysis_result['status'] != 'success':
            return {
                'status': 'error',
                'message': analysis_result['message']
            }
        
        # 如果查询中包含生成报告的请求
        if '报告' in query or '生成' in query:
            report_path = self.report_service.generate_report(
                report_type='behavior',
                student_id=student_id,
                format_type=format_type
            )
            
            return {
                'status': 'success',
                'type': 'report',
                'report_path': report_path,
                'message': f'已生成学习行为分析报告，格式为{format_type}'
            }
        
        # 构建回复内容
        behavior_profile = analysis_result['behavior_profile']
        response_content = '学习行为分析结果：\n'
        
        # 添加学生信息
        if student_id:
            response_content += f'学生ID: {student_id}\n'
        
        # 添加答题高峰时段
        response_content += '\n答题高峰时段：\n'
        for peak_hour in behavior_profile['peak_hours']:
            response_content += f"  - {peak_hour['hour']}点: {peak_hour['count']}次提交\n"
        
        # 添加答题状态分布
        response_content += '\n答题状态分布：\n'
        for state, count in behavior_profile['state_distribution'].items():
            response_content += f"  - {state}: {count}次\n"
        
        # 添加正确答题率
        response_content += f"\n正确答题率: {behavior_profile['correct_rate']:.2%}\n"
        
        # 添加平均答题时间和内存使用
        response_content += f"平均答题时间: {behavior_profile['avg_time_consume']:.2f}秒\n"
        response_content += f"平均内存使用: {behavior_profile['avg_memory']:.2f}\n"
        
        # 如果有相对表现数据，添加相对表现
        if 'relative_performance' in behavior_profile:
            response_content += '\n相对表现（与平均水平比较）：\n'
            rel_perf = behavior_profile['relative_performance']
            response_content += f"  - 正确率: {'+' if rel_perf['correct_rate_vs_avg'] >= 0 else ''}{rel_perf['correct_rate_vs_avg']:.2%}\n"
            response_content += f"  - 答题时间: {'+' if rel_perf['time_consume_vs_avg'] >= 0 else ''}{rel_perf['time_consume_vs_avg']:.2f}秒\n"
        
        return {
            'status': 'success',
            'type': 'text',
            'content': response_content
        }
    
    def _process_difficulty_query(self, query, student_id=None, report_type=None, format_type=None):
        """处理题目难度相关的查询"""
        # 分析题目难度
        analysis_result = self.analysis_service.analyze_question_difficulty()
        
        if analysis_result['status'] != 'success':
            return {
                'status': 'error',
                'message': analysis_result['message']
            }
        
        # 如果查询中包含生成报告的请求
        if '报告' in query or '生成' in query:
            report_path = self.report_service.generate_report(
                report_type='difficulty',
                format_type=format_type
            )
            
            return {
                'status': 'success',
                'type': 'report',
                'report_path': report_path,
                'message': f'已生成题目难度分析报告，格式为{format_type}'
            }
        
        # 构建回复内容
        response_content = '题目难度分析结果：\n'
        
        # 添加不合理题目分析
        unreasonable_questions = analysis_result['unreasonable_questions']
        if unreasonable_questions:
            response_content += f'\n发现{len(unreasonable_questions)}道不合理难度的题目：\n'
            for i, question in enumerate(unreasonable_questions, 1):
                response_content += f"\n{i}. 题目ID: {question['title_id']}\n"
                response_content += f"   - 知识点: {question['knowledge']}\n"
                response_content += f"   - 从属知识点: {question['sub_knowledge']}\n"
                response_content += f"   - 题目正确率: {question['correct_rate']:.2%}\n"
                response_content += f"   - 学生知识掌握度: {question['avg_mastery']:.2%}\n"
                response_content += f"   - 原因: {question['reason']}\n"
        else:
            response_content += '\n未发现不合理难度的题目。\n'
        
        return {
            'status': 'success',
            'type': 'text',
            'content': response_content
        }
    
    def _process_report_query(self, query, student_id=None, report_type=None, format_type=None):
        """处理报告生成相关的查询"""
        # 生成报告
        report_path = self.report_service.generate_report(
            report_type=report_type,
            student_id=student_id,
            format_type=format_type
        )
        
        # 构建回复内容
        report_type_names = {
            'knowledge': '知识点掌握度',
            'behavior': '学习行为',
            'difficulty': '题目难度',
            'general': '综合分析'
        }
        
        report_type_name = report_type_names.get(report_type, '分析')
        
        return {
            'status': 'success',
            'type': 'report',
            'report_path': report_path,
            'message': f'已生成{report_type_name}报告，格式为{format_type}'
        }