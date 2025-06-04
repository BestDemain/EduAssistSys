import os
import json
import base64
from zhipuai import ZhipuAI
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from io import BytesIO
import matplotlib
matplotlib.use('Agg')  # 使用非交互式后端

class AIReportService:
    def __init__(self):
        self.api_key = None
        self.client = None
        self.reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'reports')
        self.images_dir = os.path.join(self.reports_dir, 'images')
        
        # 确保目录存在
        os.makedirs(self.reports_dir, exist_ok=True)
        os.makedirs(self.images_dir, exist_ok=True)
        
        # 设置中文字体
        plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
        plt.rcParams['axes.unicode_minus'] = False
        
        # 自动尝试从环境变量获取API密钥
        self._try_init_api_key()
    
    def _try_init_api_key(self):
        """尝试从环境变量初始化API密钥"""
        env_api_key = os.getenv("ZHIPUAI_API_KEY")
        if env_api_key:
            self.api_key = env_api_key
            self.client = ZhipuAI(api_key=self.api_key)
            print("已从环境变量自动加载ZHIPUAI_API_KEY")
    
    def set_api_key(self, api_key):
        """设置API密钥"""
        if api_key:
            # 用户提供了API密钥，使用用户提供的
            self.api_key = api_key
            self.client = ZhipuAI(api_key=self.api_key)
            return True
        elif self.api_key:
            # 用户未提供API密钥，但已有API密钥（可能来自环境变量）
            return True
        else:
            # 用户未提供API密钥，且没有现有的API密钥，尝试从环境变量获取
            env_api_key = os.getenv("ZHIPUAI_API_KEY")
            if env_api_key:
                self.api_key = env_api_key
                self.client = ZhipuAI(api_key=self.api_key)
                return True
            return False
    
    def save_chart_as_image(self, chart_data, chart_type, filename):
        """将图表数据保存为图片"""
        try:
            plt.figure(figsize=(10, 6))
            
            if chart_type == 'radar':
                # 雷达图
                categories = list(chart_data.keys())
                values = list(chart_data.values())
                
                # 计算角度
                angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()
                values += values[:1]  # 闭合图形
                angles += angles[:1]
                
                ax = plt.subplot(111, projection='polar')
                ax.plot(angles, values, 'o-', linewidth=2)
                ax.fill(angles, values, alpha=0.25)
                ax.set_xticks(angles[:-1])
                ax.set_xticklabels(categories)
                ax.set_ylim(0, 100)
                plt.title('知识点掌握度雷达图', pad=20)
                
            elif chart_type == 'bar':
                # 柱状图
                categories = list(chart_data.keys())
                values = list(chart_data.values())
                
                plt.bar(categories, values, color='skyblue')
                plt.title('数据分布图')
                plt.xlabel('类别')
                plt.ylabel('数值')
                plt.xticks(rotation=45)
                
            elif chart_type == 'line':
                # 折线图
                if isinstance(chart_data, dict) and 'x' in chart_data and 'y' in chart_data:
                    plt.plot(chart_data['x'], chart_data['y'], marker='o')
                    plt.title('时序分析图')
                    plt.xlabel('时间')
                    plt.ylabel('数值')
                else:
                    categories = list(chart_data.keys())
                    values = list(chart_data.values())
                    plt.plot(categories, values, marker='o')
                    plt.title('趋势分析图')
                    plt.xticks(rotation=45)
                    
            elif chart_type == 'pie':
                # 饼图
                labels = list(chart_data.keys())
                sizes = list(chart_data.values())
                
                plt.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90)
                plt.title('分布饼图')
                plt.axis('equal')
            
            plt.tight_layout()
            
            # 保存图片
            image_path = os.path.join(self.images_dir, filename)
            plt.savefig(image_path, dpi=300, bbox_inches='tight')
            plt.close()
            
            return image_path
            
        except Exception as e:
            print(f"保存图表失败: {e}")
            plt.close()
            return None
    
    def analyze_chart_with_multimodal(self, image_path, chart_type, analysis_prompt=None):
        """
        使用多模态大模型分析图表图像
        """
        if not self.client:
            return {'status': 'error', 'message': 'API密钥未设置'}
        
        try:
            # 读取图像文件并转换为base64
            with open(image_path, 'rb') as img_file:
                img_base64 = base64.b64encode(img_file.read()).decode('utf-8')
            
            # 根据图表类型设置默认分析提示
            if not analysis_prompt:
                if 'knowledge' in chart_type or 'radar' in chart_type:
                    analysis_prompt = "请分析这个知识点掌握度雷达图，重点关注：1）各知识点的掌握程度差异；2）识别薄弱知识点；3）知识结构的均衡性；4）提供针对性的学习建议。"
                elif 'behavior' in chart_type or 'hour' in chart_type or 'week' in chart_type:
                    analysis_prompt = "请分析这个学习行为时间分布图，重点关注：1）学习时间的分布特征；2）学习习惯和规律；3）高效学习时段识别；4）时间管理建议。"
                elif 'difficulty' in chart_type:
                    analysis_prompt = "请分析这个题目难度分析图，重点关注：1）难度分布是否合理；2）学习者与题目难度的匹配程度；3）挑战性和可达性的平衡；4）难度调整建议。"
                elif 'state' in chart_type or 'method' in chart_type:
                    analysis_prompt = "请分析这个答题状态/方法分布图，重点关注：1）答题策略的多样性；2）正确率与方法的关联；3）学习行为模式；4）策略优化建议。"
                else:
                    analysis_prompt = "请详细分析这个图表，提供专业的教育数据分析见解和建议。"
            
            # 调用GLM-4V多模态模型
            response = self.client.chat.completions.create(
                model="glm-4v-flash",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": img_base64
                                }
                            },
                            {
                                "type": "text",
                                "text": analysis_prompt
                            }
                        ]
                    }
                ]
            )
            
            analysis_result = response.choices[0].message.content
            
            return {
                'status': 'success',
                'chart_type': chart_type,
                'analysis': analysis_result,
                'image_path': image_path
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'图表分析失败: {str(e)}',
                'chart_type': chart_type
            }
    
    def generate_student_report_with_multimodal(self, student_id, saved_charts, knowledge_data=None, behavior_data=None, difficulty_data=None):
        """
        使用多模态分析生成学生个人报告
        """
        if not self.client:
            if not self.set_api_key(None):
                return {'status': 'error', 'message': 'API密钥未设置或无效，请设置环境变量ZHIPUAI_API_KEY或手动输入API密钥'}
        
        try:
            # 分析所有保存的图表
            chart_analyses = {}
            
            for chart_info in saved_charts:
                chart_path = chart_info.get('path')
                chart_type = chart_info.get('type')
                chart_title = chart_info.get('title')
                
                if chart_path and os.path.exists(chart_path):
                    print(f"正在分析图表: {chart_title}")
                    analysis_result = self.analyze_chart_with_multimodal(chart_path, chart_type)
                    
                    if analysis_result['status'] == 'success':
                        chart_analyses[chart_type] = {
                            'title': chart_title,
                            'analysis': analysis_result['analysis'],
                            'filename': chart_info.get('filename')
                        }
                        print(f"图表分析完成: {chart_title}")
                    else:
                        print(f"图表分析失败: {chart_title} - {analysis_result.get('message')}")
            
            # 构建综合分析提示词
            prompt = f"""
你是一位专业的教育数据分析师，正在为NorthClass高等教育培训机构分析学习者的学习情况。

应用场景：
NorthClass是一家知名的高等教育培训机构，开设了超过100门课程，涵盖文学、理学、工学、医学、经济学、管理学等多个学科领域。该机构推出了编程课程，要求学习者完成指定的编程任务，允许多次尝试和提交。课程结束后，机构收集了学习者的时序学习数据，用于评估教学效果。

学生ID: {student_id}

基于以下多模态图表分析结果，请生成一份专业的综合学习分析报告：

"""
            
            # 添加图表分析结果
            for chart_type, analysis_info in chart_analyses.items():
                prompt += f"""
## {analysis_info['title']}分析结果：
{analysis_info['analysis']}

"""
            
            # 添加原始数据（如果有）
            if knowledge_data:
                prompt += f"""
## 原始知识掌握度数据：
{json.dumps(knowledge_data, ensure_ascii=False, indent=2)}

"""
            
            if behavior_data:
                prompt += f"""
## 原始学习行为数据：
{json.dumps(behavior_data, ensure_ascii=False, indent=2)}

"""
            
            prompt += """
请基于以上多模态图表分析结果和原始数据，生成一份专业的综合学习分析报告，包含以下内容：

## 1. 学习者概况
- 基本学习表现总结
- 整体学习状态评估

## 2. 多维度深度分析
- 知识掌握度深度分析（结合雷达图分析）
- 学习行为模式深度分析（结合时间分布图分析）
- 答题策略和方法分析（结合状态/方法分布图分析）
- 难度匹配度分析（结合难度分析图）

## 3. 关键发现与洞察
- 基于图表分析的关键发现
- 学习模式和行为特征总结
- 优势和劣势识别

## 4. 个性化建议
- 针对性学习策略建议
- 知识点强化方案
- 学习时间和方法优化建议
- 难度调整和挑战设计建议

## 5. 后续跟踪建议
- 重点关注指标
- 改进效果评估方法

注意要求：
- 充分利用多模态图表分析的深度洞察
- 报告应该专业、客观、具有建设性
- 基于数据和图表分析进行量化分析
- 提供具体可操作的改进建议
- 报告长度控制在1500-2000字
- 使用教育专业术语，体现分析的专业性
"""
            
            # 调用大模型生成综合报告
            completion = self.client.chat.completions.create(
                model="glm-4-flash",
                temperature=0.7,
                messages=[
                    {"role": "system", "content": "你是一位专业的教育数据分析师，擅长基于多模态图表分析结果生成深度学习分析报告。你需要充分利用图表分析的洞察，结合原始数据，提供专业、全面、有针对性的教育建议。"},
                    {"role": "user", "content": prompt}
                ]
            )
            
            report_content = completion.choices[0].message.content
            
            # 保存报告
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_filename = f"student_{student_id}_multimodal_report_{timestamp}.md"
            report_path = os.path.join(self.reports_dir, report_filename)
            
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(report_content)
            
            return {
                'status': 'success',
                'student_id': student_id,
                'report': report_content,
                'report_content': report_content,
                'report_path': report_path,
                'chart_analyses': chart_analyses,
                'timestamp': timestamp,
                'analysis_type': 'multimodal'
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'生成多模态学生报告失败: {str(e)}'
            }
    
    def generate_student_report(self, student_id, knowledge_data, behavior_data, difficulty_data=None):
        """
        生成学生个人报告（原有方法保持不变）
        """
        if not self.client:
            # 尝试从环境变量初始化API密钥
            if not self.set_api_key(None):
                return {'status': 'error', 'message': 'API密钥未设置或无效，请设置环境变量ZHIPUAI_API_KEY或手动输入API密钥'}
        
        try:
            # 保存图表
            chart_files = {}
            
            # 1. 知识点掌握度雷达图
            if knowledge_data and 'knowledge_mastery' in knowledge_data:
                mastery_data = {}
                for knowledge, data in knowledge_data['knowledge_mastery'].items():
                    mastery_data[knowledge] = data.get('mastery_level', 0) * 100
                
                radar_file = f"student_{student_id}_knowledge_radar.png"
                radar_path = self.save_chart_as_image(mastery_data, 'radar', radar_file)
                if radar_path:
                    chart_files['knowledge_radar.png'] = radar_path
            
            # 2. 学习行为时间分布图
            if behavior_data and 'behavior_profile' in behavior_data:
                profile = behavior_data['behavior_profile']
                
                # 小时分布图
                if 'hour_distribution' in profile:
                    hour_data = {}
                    for item in profile['hour_distribution']:
                        hour_data[f"{item['hour']}:00"] = item['count']
                    
                    hour_file = f"student_{student_id}_hour_distribution.png"
                    hour_path = self.save_chart_as_image(hour_data, 'bar', hour_file)
                    if hour_path:
                        chart_files['behavior_chart.png'] = hour_path
                
                # 状态分布饼图
                if 'state_distribution' in profile:
                    state_file = f"student_{student_id}_state_distribution.png"
                    state_path = self.save_chart_as_image(profile['state_distribution'], 'pie', state_file)
                    if state_path:
                        chart_files['difficulty_chart.png'] = state_path
            
            # 构建提示词
            prompt = f"""
你是一位专业的教育数据分析师，正在为NorthClass高等教育培训机构分析学习者的学习情况。

应用场景：
NorthClass是一家知名的高等教育培训机构，开设了超过100门课程，涵盖文学、理学、工学、医学、经济学、管理学等多个学科领域。该机构推出了编程课程，要求学习者完成指定的编程任务，允许多次尝试和提交。课程结束后，机构收集了学习者的时序学习数据，用于评估教学效果。

分析目标：
1. 量化评估知识点掌握程度，识别知识体系中的薄弱环节
2. 挖掘个性化学习行为模式，展示学习者画像
3. 分析答题行为日志，从多维度属性评估学习效果
4. 识别题目难度与知识掌握程度的匹配情况

请基于以下学生数据生成详细的学习分析报告：

学生ID: {student_id}

知识掌握度数据：
{json.dumps(knowledge_data, ensure_ascii=False, indent=2) if knowledge_data else '暂无数据'}

学习行为数据：
{json.dumps(behavior_data, ensure_ascii=False, indent=2) if behavior_data else '暂无数据'}

可用图表：
{', '.join([f'{desc}: {filename}' for desc, filename in chart_files.items()])}

请生成一份专业的学习分析报告，包含以下内容：

## 1. 学习者概况
- 基本学习表现总结
- 整体学习状态评估

## 2. 知识掌握度分析
- 各知识点掌握程度详细分析
- 知识体系薄弱环节识别
- 知识点间关联性分析
（请在此处引用：![知识掌握度雷达图](knowledge_radar.png)）

## 3. 学习行为模式分析
- 答题行为特征分析（答题频率、时间分布等）
- 学习习惯和偏好识别
- 答题正确率和效率分析
（请在此处引用：![学习行为统计图](behavior_chart.png)）

## 4. 难度匹配度分析
- 题目难度与掌握程度匹配情况
- 不合理难度题目识别
- 学习挑战度评估
（请在此处引用：![难度匹配趋势图](difficulty_chart.png)）

## 5. 问题诊断与建议
- 主要学习困难识别
- 个性化学习路径建议
- 教学策略调整建议

注意要求：
- 报告应该专业、客观、具有建设性
- 基于数据进行量化分析，避免空泛描述
- 在指定位置准确引用相应的图表
- 提供具体可操作的改进建议
- 报告长度控制在1000-1500字
- 使用教育专业术语，体现分析的专业性
            """
            
            # 调用智谱AI
            completion = self.client.chat.completions.create(
                model="glm-4-flash",
                temperature=0.7,
                messages=[
                    {"role": "system", "content": "你是一位专业的教育数据分析师，擅长分析学习数据并生成专业报告。你需要基于提供的数据进行深入分析，识别学习模式，诊断学习问题，并提供有针对性的教育建议。"},
                    {"role": "user", "content": prompt}
                ]
            )
            
            report_content = completion.choices[0].message.content
            
            # 保存报告
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_filename = f"student_{student_id}_report_{timestamp}.md"
            report_path = os.path.join(self.reports_dir, report_filename)
            
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(report_content)
            
            return {
                'status': 'success',
                'student_id': student_id,
                'report': report_content,
                'report_content': report_content,
                'report_path': report_path,
                'chart_files': chart_files,
                'timestamp': timestamp
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'生成学生报告失败: {str(e)}'
            }
    
    def generate_class_report(self, class_data, analysis_data):
        """生成班级整体报告"""
        if not self.client:
            # 尝试从环境变量初始化API密钥
            if not self.set_api_key(None):
                return {'status': 'error', 'message': 'API密钥未设置或无效，请设置环境变量ZHIPUAI_API_KEY或手动输入API密钥'}
        
        try:
            # 构建提示词
            system_prompt = """
你是一个专业的教育数据分析师，负责为NorthClass教育培训机构生成班级整体学习分析报告。

你的任务：
1. 基于提供的班级学习数据，生成一份专业的班级整体分析报告
2. 报告应包含整体掌握情况、学习行为趋势、问题识别等内容
3. 提供班级教学建议和改进方案
4. 报告应专业、客观、有建设性
"""
            
            user_content = f"""
请生成班级整体学习分析报告。

班级数据：
{json.dumps(class_data, ensure_ascii=False, indent=2) if class_data else '暂无数据'}

分析数据：
{json.dumps(analysis_data, ensure_ascii=False, indent=2) if analysis_data else '暂无数据'}

请生成一份详细的班级分析报告。
"""
            
            # 调用大模型
            completion = self.client.chat.completions.create(
                model="glm-4-flash",
                temperature=0.7,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ]
            )
            
            report_content = completion.choices[0].message.content
            
            # 保存报告
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_filename = f"class_report_{timestamp}.md"
            report_path = os.path.join(self.reports_dir, report_filename)
            
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(report_content)
            
            return {
                'status': 'success',
                'report_content': report_content,
                'report_path': report_path,
                'timestamp': timestamp
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'生成报告失败: {str(e)}'
            }
    
    def replace_image_references(self, report_content, chart_files):
        """
        将报告中的图片引用替换为实际的图表
        """
        try:
            # 替换图片引用为HTML图片标签
            for placeholder, filepath in chart_files.items():
                # 获取文件名
                filename = os.path.basename(filepath)
                # 构建图片URL
                image_url = f'/api/report/images/{filename}'
                
                # 替换Markdown图片语法为HTML
                report_content = report_content.replace(
                    f'![知识掌握度雷达图]({placeholder})',
                    f'<img src="{image_url}" alt="知识掌握度雷达图" style="max-width: 100%; height: auto; margin: 10px 0;" />'
                )
                report_content = report_content.replace(
                    f'![学习行为统计图]({placeholder})',
                    f'<img src="{image_url}" alt="学习行为统计图" style="max-width: 100%; height: auto; margin: 10px 0;" />'
                )
                report_content = report_content.replace(
                    f'![难度匹配趋势图]({placeholder})',
                    f'<img src="{image_url}" alt="难度匹配趋势图" style="max-width: 100%; height: auto; margin: 10px 0;" />'
                )
            
            return report_content
            
        except Exception as e:
            print(f"替换图片引用失败: {str(e)}")
            return report_content