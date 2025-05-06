# 报告生成服务模块 - 负责生成分析报告

import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
from pathlib import Path
import json
import base64
from io import BytesIO
from matplotlib.font_manager import FontProperties
from services.data_service import DataService
from services.analysis_service import AnalysisService

# 设置中文字体
try:
    # 尝试设置中文字体
    plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']
    plt.rcParams['axes.unicode_minus'] = False
except:
    print("警告: 无法设置中文字体，图表中的中文可能无法正确显示")

class ReportService:
    def __init__(self):
        self.data_service = DataService()
        self.analysis_service = AnalysisService()
        
        # 报告保存目录
        self.report_dir = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) / 'reports'
        os.makedirs(self.report_dir, exist_ok=True)
    
    def generate_report(self, report_type='general', student_id=None, format_type='pdf', content=None):
        """生成分析报告
        
        Args:
            report_type: 报告类型，可选值：'general'(总体报告), 'knowledge'(知识点掌握报告), 
                         'behavior'(学习行为报告), 'difficulty'(题目难度报告)
            student_id: 学生ID，如果为None则生成所有学生的汇总报告
            format_type: 报告格式，可选值：'pdf', 'html', 'docx', 'xlsx'
            content: 报告内容配置，指定要包含的内容和图表
            
        Returns:
            生成的报告文件路径
        """
        # 根据报告类型调用相应的报告生成方法
        if report_type == 'knowledge':
            return self._generate_knowledge_report(student_id, format_type, content)
        elif report_type == 'behavior':
            return self._generate_behavior_report(student_id, format_type, content)
        elif report_type == 'difficulty':
            return self._generate_difficulty_report(format_type, content)
        else:  # 默认生成综合报告
            return self._generate_general_report(student_id, format_type, content)
    
    def _generate_knowledge_report(self, student_id=None, format_type='pdf', content=None):
        """生成知识点掌握报告"""
        # 获取知识点掌握度分析结果
        analysis_result = self.analysis_service.analyze_knowledge_mastery(student_id)
        
        if analysis_result['status'] != 'success':
            return {'error': analysis_result['message']}
        
        # 生成报告文件名
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        student_suffix = f"_{student_id}" if student_id else "_all"
        filename = f"knowledge_report{student_suffix}_{timestamp}.{format_type}"
        file_path = self.report_dir / filename
        
        # 根据格式类型生成报告
        if format_type == 'pdf':
            self._generate_pdf_knowledge_report(analysis_result, file_path, content)
        elif format_type == 'html':
            self._generate_html_knowledge_report(analysis_result, file_path, content)
        elif format_type == 'docx':
            self._generate_docx_knowledge_report(analysis_result, file_path, content)
        elif format_type == 'xlsx':
            self._generate_xlsx_knowledge_report(analysis_result, file_path, content)
        else:
            return {'error': f'不支持的报告格式: {format_type}'}
        
        return str(file_path)
    
    def _generate_behavior_report(self, student_id=None, format_type='pdf', content=None):
        """生成学习行为报告"""
        # 获取学习行为分析结果
        analysis_result = self.analysis_service.analyze_learning_behavior(student_id)
        
        if analysis_result['status'] != 'success':
            return {'error': analysis_result['message']}
        
        # 生成报告文件名
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        student_suffix = f"_{student_id}" if student_id else "_all"
        filename = f"behavior_report{student_suffix}_{timestamp}.{format_type}"
        file_path = self.report_dir / filename
        
        # 根据格式类型生成报告
        if format_type == 'pdf':
            self._generate_pdf_behavior_report(analysis_result, file_path, content)
        elif format_type == 'html':
            self._generate_html_behavior_report(analysis_result, file_path, content)
        elif format_type == 'docx':
            self._generate_docx_behavior_report(analysis_result, file_path, content)
        elif format_type == 'xlsx':
            self._generate_xlsx_behavior_report(analysis_result, file_path, content)
        else:
            return {'error': f'不支持的报告格式: {format_type}'}
        
        return str(file_path)
    
    def _generate_difficulty_report(self, format_type='pdf', content=None):
        """生成题目难度报告"""
        # 获取题目难度分析结果
        analysis_result = self.analysis_service.analyze_question_difficulty()
        
        if analysis_result['status'] != 'success':
            return {'error': analysis_result['message']}
        
        # 生成报告文件名
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        filename = f"difficulty_report_{timestamp}.{format_type}"
        file_path = self.report_dir / filename
        
        # 根据格式类型生成报告
        if format_type == 'pdf':
            self._generate_pdf_difficulty_report(analysis_result, file_path, content)
        elif format_type == 'html':
            self._generate_html_difficulty_report(analysis_result, file_path, content)
        elif format_type == 'docx':
            self._generate_docx_difficulty_report(analysis_result, file_path, content)
        elif format_type == 'xlsx':
            self._generate_xlsx_difficulty_report(analysis_result, file_path, content)
        else:
            return {'error': f'不支持的报告格式: {format_type}'}
        
        return str(file_path)
    
    def _generate_general_report(self, student_id=None, format_type='pdf', content=None):
        """生成综合分析报告"""
        # 获取各项分析结果
        knowledge_result = self.analysis_service.analyze_knowledge_mastery(student_id)
        behavior_result = self.analysis_service.analyze_learning_behavior(student_id)
        difficulty_result = self.analysis_service.analyze_question_difficulty()
        
        # 检查分析结果状态
        if knowledge_result['status'] != 'success' or \
           behavior_result['status'] != 'success' or \
           difficulty_result['status'] != 'success':
            return {'error': '获取分析数据失败'}
        
        # 生成报告文件名
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        student_suffix = f"_{student_id}" if student_id else "_all"
        filename = f"general_report{student_suffix}_{timestamp}.{format_type}"
        file_path = self.report_dir / filename
        
        # 合并分析结果
        analysis_result = {
            'knowledge': knowledge_result,
            'behavior': behavior_result,
            'difficulty': difficulty_result
        }
        
        # 根据格式类型生成报告
        if format_type == 'pdf':
            self._generate_pdf_general_report(analysis_result, file_path, content)
        elif format_type == 'html':
            self._generate_html_general_report(analysis_result, file_path, content)
        elif format_type == 'docx':
            self._generate_docx_general_report(analysis_result, file_path, content)
        elif format_type == 'xlsx':
            self._generate_xlsx_general_report(analysis_result, file_path, content)
        else:
            return {'error': f'不支持的报告格式: {format_type}'}
        
        return str(file_path)
    
    # PDF报告生成方法
    def _generate_pdf_knowledge_report(self, analysis_result, file_path, content=None):
        """生成PDF格式的知识点掌握报告"""
        # 这里使用reportlab库生成PDF报告
        # 由于实现复杂，这里仅提供示例框架
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.pdfgen import canvas
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
            from reportlab.lib import colors
            
            # 创建PDF文档
            doc = SimpleDocTemplate(str(file_path), pagesize=letter)
            styles = getSampleStyleSheet()
            story = []
            
            # 添加标题
            title = "知识点掌握度分析报告"
            if analysis_result.get('student_id'):
                title += f" - 学生ID: {analysis_result['student_id']}"
            story.append(Paragraph(title, styles['Title']))
            story.append(Spacer(1, 12))
            
            # 添加报告生成时间
            story.append(Paragraph(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
            story.append(Spacer(1, 12))
            
            # 添加知识点掌握情况
            story.append(Paragraph("知识点掌握情况", styles['Heading2']))
            story.append(Spacer(1, 6))
            
            # 创建知识点掌握情况表格
            knowledge_data = [['知识点', '正确率', '正确提交率', '平均用时', '总提交次数', '正确提交次数']]
            for knowledge, data in analysis_result['knowledge_mastery'].items():
                knowledge_data.append([
                    knowledge,
                    f"{data['correct_rate']:.2%}",
                    f"{data['correct_submission_rate']:.2%}",
                    f"{data['avg_time_consume']:.2f}秒",
                    str(data['total_submissions']),
                    str(data['correct_submissions'])
                ])
            
            # 创建表格
            table = Table(knowledge_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(table)
            story.append(Spacer(1, 12))
            
            # 添加薄弱环节分析
            if analysis_result['weak_points']:
                story.append(Paragraph("薄弱环节分析", styles['Heading2']))
                story.append(Spacer(1, 6))
                
                for weak_point in analysis_result['weak_points']:
                    text = f"知识点 '{weak_point['knowledge']}' "
                    if 'sub_knowledge' in weak_point:
                        text += f"的从属知识点 '{weak_point['sub_knowledge']}' "
                    text += f"正确率为 {weak_point['correct_rate']:.2%}，{weak_point['reason']}。"
                    story.append(Paragraph(text, styles['Normal']))
                    story.append(Spacer(1, 6))
            
            # 生成PDF
            doc.build(story)
            print(f"已生成PDF报告: {file_path}")
            
        except Exception as e:
            print(f"生成PDF报告失败: {e}")
            return {'error': f'生成PDF报告失败: {e}'}
    
    def _generate_pdf_behavior_report(self, analysis_result, file_path, content=None):
        """生成PDF格式的学习行为报告"""
        # 实现类似于_generate_pdf_knowledge_report的方法
        pass
    
    def _generate_pdf_difficulty_report(self, analysis_result, file_path, content=None):
        """生成PDF格式的题目难度报告"""
        # 实现类似于_generate_pdf_knowledge_report的方法
        pass
    
    def _generate_pdf_general_report(self, analysis_result, file_path, content=None):
        """生成PDF格式的综合分析报告"""
        # 实现类似于_generate_pdf_knowledge_report的方法
        pass
    
    # HTML报告生成方法
    def _generate_html_knowledge_report(self, analysis_result, file_path, content=None):
        """生成HTML格式的知识点掌握报告"""
        # 使用简单的HTML模板生成报告
        try:
            # 创建HTML内容
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>知识点掌握度分析报告</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    h1 {{ color: #333; }}
                    h2 {{ color: #666; }}
                    table {{ border-collapse: collapse; width: 100%; margin-bottom: 20px; }}
                    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                    th {{ background-color: #f2f2f2; }}
                    tr:nth-child(even) {{ background-color: #f9f9f9; }}
                    .weak-point {{ color: #d9534f; }}
                </style>
            </head>
            <body>
                <h1>知识点掌握度分析报告</h1>
            """
            
            # 添加学生信息（如果有）
            if analysis_result.get('student_id'):
                html_content += f"<p>学生ID: {analysis_result['student_id']}</p>"
            
            # 添加报告生成时间
            html_content += f"<p>报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>"
            
            # 添加知识点掌握情况表格
            html_content += """
                <h2>知识点掌握情况</h2>
                <table>
                    <tr>
                        <th>知识点</th>
                        <th>正确率</th>
                        <th>正确提交率</th>
                        <th>平均用时</th>
                        <th>总提交次数</th>
                        <th>正确提交次数</th>
                    </tr>
            """
            
            for knowledge, data in analysis_result['knowledge_mastery'].items():
                html_content += f"""
                    <tr>
                        <td>{knowledge}</td>
                        <td>{data['correct_rate']:.2%}</td>
                        <td>{data['correct_submission_rate']:.2%}</td>
                        <td>{data['avg_time_consume']:.2f}秒</td>
                        <td>{data['total_submissions']}</td>
                        <td>{data['correct_submissions']}</td>
                    </tr>
                """
            
            html_content += "</table>"
            
            # 添加薄弱环节分析
            if analysis_result['weak_points']:
                html_content += "<h2>薄弱环节分析</h2><ul>"
                
                for weak_point in analysis_result['weak_points']:
                    text = f"知识点 '{weak_point['knowledge']}' "
                    if 'sub_knowledge' in weak_point:
                        text += f"的从属知识点 '{weak_point['sub_knowledge']}' "
                    text += f"正确率为 {weak_point['correct_rate']:.2%}，{weak_point['reason']}。"
                    html_content += f"<li class='weak-point'>{text}</li>"
                
                html_content += "</ul>"
            
            # 结束HTML
            html_content += """
            </body>
            </html>
            """
            
            # 写入文件
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            print(f"已生成HTML报告: {file_path}")
            
        except Exception as e:
            print(f"生成HTML报告失败: {e}")
            return {'error': f'生成HTML报告失败: {e}'}
    
    def _generate_html_behavior_report(self, analysis_result, file_path, content=None):
        """生成HTML格式的学习行为报告"""
        # 实现类似于_generate_html_knowledge_report的方法
        pass
    
    def _generate_html_difficulty_report(self, analysis_result, file_path, content=None):
        """生成HTML格式的题目难度报告"""
        # 实现类似于_generate_html_knowledge_report的方法
        pass
    
    def _generate_html_general_report(self, analysis_result, file_path, content=None):
        """生成HTML格式的综合分析报告"""
        # 实现类似于_generate_html_knowledge_report的方法
        pass
    
    # DOCX报告生成方法
    def _generate_docx_knowledge_report(self, analysis_result, file_path, content=None):
        """生成DOCX格式的知识点掌握报告"""
        try:
            from docx import Document
            from docx.shared import Inches, Pt
            from docx.enum.text import WD_ALIGN_PARAGRAPH
            
            # 创建文档
            doc = Document()
            
            # 添加标题
            title = doc.add_heading('知识点掌握度分析报告', 0)
            title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            
            # 添加学生信息（如果有）
            if analysis_result.get('student_id'):
                p = doc.add_paragraph(f"学生ID: {analysis_result['student_id']}")
            
            # 添加报告生成时间
            doc.add_paragraph(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            # 添加知识点掌握情况
            doc.add_heading('知识点掌握情况', level=1)
            
            # 创建表格
            table = doc.add_table(rows=1, cols=6)
            table.style = 'Table Grid'
            
            # 设置表头
            header_cells = table.rows[0].cells
            header_cells[0].text = '知识点'
            header_cells[1].text = '正确率'
            header_cells[2].text = '正确提交率'
            header_cells[3].text = '平均用时'
            header_cells[4].text = '总提交次数'
            header_cells[5].text = '正确提交次数'
            
            # 添加数据行
            for knowledge, data in analysis_result['knowledge_mastery'].items():
                row_cells = table.add_row().cells
                row_cells[0].text = knowledge
                row_cells[1].text = f"{data['correct_rate']:.2%}"
                row_cells[2].text = f"{data['correct_submission_rate']:.2%}"
                row_cells[3].text = f"{data['avg_time_consume']:.2f}秒"
                row_cells[4].text = str(data['total_submissions'])
                row_cells[5].text = str(data['correct_submissions'])
            
            # 添加薄弱环节分析
            if analysis_result['weak_points']:
                doc.add_heading('薄弱环节分析', level=1)
                
                for weak_point in analysis_result['weak_points']:
                    text = f"知识点 '{weak_point['knowledge']}' "
                    if 'sub_knowledge' in weak_point:
                        text += f"的从属知识点 '{weak_point['sub_knowledge']}' "
                    text += f"正确率为 {weak_point['correct_rate']:.2%}，{weak_point['reason']}。"
                    doc.add_paragraph(text)
            
            # 保存文档
            doc.save(file_path)
            print(f"已生成DOCX报告: {file_path}")
            
        except Exception as e:
            print(f"生成DOCX报告失败: {e}")
            return {'error': f'生成DOCX报告失败: {e}'}
    
    def _generate_docx_behavior_report(self, analysis_result, file_path, content=None):
        """生成DOCX格式的学习行为报告"""
        # 实现类似于_generate_docx_knowledge_report的方法
        pass
    
    def _generate_docx_difficulty_report(self, analysis_result, file_path, content=None):
        """生成DOCX格式的题目难度报告"""
        # 实现类似于_generate_docx_knowledge_report的方法
        pass
    
    def _generate_docx_general_report(self, analysis_result, file_path, content=None):
        """生成DOCX格式的综合分析报告"""
        # 实现类似于_generate_docx_knowledge_report的方法
        pass
    
    # XLSX报告生成方法
    def _generate_xlsx_knowledge_report(self, analysis_result, file_path, content=None):
        """生成XLSX格式的知识点掌握报告"""
        try:
            # 创建Excel工作簿
            writer = pd.ExcelWriter(file_path, engine='xlsxwriter')
            
            # 创建知识点掌握情况数据框
            knowledge_data = []
            for knowledge, data in analysis_result['knowledge_mastery'].items():
                knowledge_data.append({
                    '知识点': knowledge,
                    '正确率': data['correct_rate'],
                    '正确提交率': data['correct_submission_rate'],
                    '平均用时(秒)': data['avg_time_consume'],
                    '总提交次数': data['total_submissions'],
                    '正确提交次数': data['correct_submissions'],
                    '总分': data['total_score'],
                    '获得分数': data['earned_score']
                })
            
            # 转换为DataFrame并写入Excel
            knowledge_df = pd.DataFrame(knowledge_data)
            knowledge_df.to_excel(writer, sheet_name='知识点掌握情况', index=False)
            
            # 创建薄弱环节数据框
            if analysis_result['weak_points']:
                weak_points_data = []
                for weak_point in analysis_result['weak_points']:
                    data = {
                        '知识点': weak_point['knowledge'],
                        '正确率': weak_point['correct_rate'],
                        '原因': weak_point['reason']
                    }
                    if 'sub_knowledge' in weak_point:
                        data['从属知识点'] = weak_point['sub_knowledge']
                    weak_points_data.append(data)
                
                weak_points_df = pd.DataFrame(weak_points_data)
                weak_points_df.to_excel(writer, sheet_name='薄弱环节分析', index=False)
            
            # 保存Excel文件
            writer.close()
            print(f"已生成XLSX报告: {file_path}")
            
        except Exception as e:
            print(f"生成XLSX报告失败: {e}")
            return {'error': f'生成XLSX报告失败: {e}'}
    
    def _generate_xlsx_behavior_report(self, analysis_result, file_path, content=None):
        """生成XLSX格式的学习行为报告"""
        # 实现类似于_generate_xlsx_knowledge_report的方法
        pass
    
    def _generate_xlsx_difficulty_report(self, analysis_result, file_path, content=None):
        """生成XLSX格式的题目难度报告"""
        # 实现类似于_generate_xlsx_knowledge_report的方法
        pass
    
    def _generate_xlsx_general_report(self, analysis_result, file_path, content=None):
        """生成XLSX格式的综合分析报告"""
        # 实现类似于_generate_xlsx_knowledge_report的方法
        pass