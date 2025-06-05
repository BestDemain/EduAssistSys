# 教育辅助可视分析系统 - 后端入口

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import pandas as pd
import numpy as np
from services.data_service import DataService
from services.analysis_service import AnalysisService
from services.report_service import ReportService
from services.nlp_service import NLPService
from services.templates import TemplateService
from services.ai_report_service import AIReportService

app = Flask(__name__)
CORS(app)  # 启用跨域请求支持

# 初始化服务
data_service = DataService()
analysis_service = AnalysisService()
report_service = ReportService()
nlp_service = NLPService()
template_service = TemplateService()
ai_report_service = AIReportService()

# 根路由
@app.route('/')
def index():
    return jsonify({
        'status': 'success',
        'message': '教育辅助可视分析系统API服务正在运行'
    })

# 获取学生信息
@app.route('/api/students', methods=['GET'])
def get_students():
    students = data_service.get_students()
    return jsonify(students)

# 获取题目信息
@app.route('/api/questions', methods=['GET'])
def get_questions():
    questions = data_service.get_questions()
    return jsonify(questions)

# 获取提交记录
@app.route('/api/submissions', methods=['GET'])
def get_submissions():
    class_id = request.args.get('class_id', 'Class1')
    student_id = request.args.get('student_id', None)
    submissions = data_service.get_submissions(class_id, student_id)
    return jsonify(submissions)

# 获取所有班级的提交记录
@app.route('/api/all_submissions', methods=['GET'])
def get_all_submissions():
    submissions = data_service.get_all_submissions()
    return jsonify(submissions)

# 知识点掌握度分析
@app.route('/api/analysis/knowledge', methods=['GET'])
def analyze_knowledge():
    student_id = request.args.get('student_id', None)
    result = analysis_service.analyze_knowledge_mastery(student_id)
    return jsonify(result)

# 知识点掌握度时序数据
@app.route('/api/analysis/knowledge/timeseries', methods=['GET'])
def analyze_knowledge_timeseries():
    student_id = request.args.get('student_id', None)
    result = analysis_service.analyze_knowledge_mastery_timeseries(student_id)
    return jsonify(result)

# 学习行为模式分析
@app.route('/api/analysis/behavior', methods=['GET'])
def analyze_behavior():
    student_id = request.args.get('student_id', None)
    result = analysis_service.analyze_learning_behavior(student_id)
    return jsonify(result)

# 题目难度分析
@app.route('/api/analysis/difficulty', methods=['GET'])
def analyze_difficulty():
    result = analysis_service.analyze_question_difficulty()
    # 递归转换 numpy.int64 为 int
    def convert_np(obj):
        import numpy as np
        if isinstance(obj, dict):
            return {k: convert_np(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_np(i) for i in obj]
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        else:
            return obj
    result = convert_np(result)
    return jsonify(result)

# 知识点散点图数据分析
@app.route('/api/analysis/knowledge-scatter', methods=['GET'])
def analyze_knowledge_scatter():
    result = analysis_service.analyze_knowledge_scatter_data()
    return jsonify(result)

# 子知识点散点图数据分析
@app.route('/api/analysis/sub-knowledge-scatter', methods=['GET'])
def analyze_sub_knowledge_scatter():
    result = analysis_service.analyze_sub_knowledge_scatter_data()
    return jsonify(result)

# 生成报告
@app.route('/api/report/generate', methods=['POST'])
def generate_report():
    data = request.json
    report_type = data.get('report_type', 'general')
    student_id = data.get('student_id', None)
    format_type = data.get('format', 'pdf')
    content = data.get('content', [])
    
    report_path = report_service.generate_report(
        report_type=report_type,
        student_id=student_id,
        format_type=format_type,
        content=content
    )
    
    return jsonify({
        'status': 'success',
        'report_path': report_path
    })

# 下载报告
@app.route('/api/report/download/<path:filename>', methods=['GET'])
def download_report(filename):
    report_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
    return send_file(os.path.join(report_dir, filename), as_attachment=True)

# 预览报告
@app.route('/api/report/preview/<path:filename>', methods=['GET'])
def preview_report(filename):
    report_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
    file_path = os.path.join(report_dir, filename)
    # 强制返回PDF内容，避免304缓存问题
    response = send_file(file_path, as_attachment=False)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# 获取报告历史记录
@app.route('/api/report/history', methods=['GET'])
def get_report_history():
    reports = report_service.get_report_history()
    return jsonify({
        'status': 'success',
        'reports': reports
    })

# 删除报告
@app.route('/api/report/<report_id>', methods=['DELETE'])
def delete_report(report_id):
    success = report_service.delete_report(report_id)
    if success:
        return jsonify({
            'status': 'success',
            'message': f'报告 {report_id} 已删除'
        })
    else:
        return jsonify({
            'status': 'error',
            'message': f'报告 {report_id} 不存在'
        }), 404

# 自然语言查询接口
@app.route('/api/nlp/query', methods=['POST'])
def nlp_query():
    data = request.json
    query = data.get('query', '')
    result = nlp_service.process_query(query)
    return jsonify(result)

# 获取报告模板列表
@app.route('/api/report/templates', methods=['GET'])
def get_templates():
    template_type = request.args.get('type', None)
    templates = template_service.get_templates(template_type)
    return jsonify({
        'status': 'success',
        'templates': templates
    })

# 获取指定ID的报告模板
@app.route('/api/report/templates/<template_id>', methods=['GET'])
def get_template(template_id):
    template = template_service.get_template(template_id)
    if template:
        return jsonify({
            'status': 'success',
            'template': template
        })
    else:
        return jsonify({
            'status': 'error',
            'message': f'模板 {template_id} 不存在'
        }), 404

# 创建或更新报告模板
@app.route('/api/report/templates', methods=['POST'])
def save_template():
    template = request.json
    template_id = template_service.save_template(template)
    return jsonify({
        'status': 'success',
        'template_id': template_id
    })

# 删除报告模板
@app.route('/api/report/templates/<template_id>', methods=['DELETE'])
def delete_template(template_id):
    success = template_service.delete_template(template_id)
    if success:
        return jsonify({
            'status': 'success',
            'message': f'模板 {template_id} 已删除'
        })
    else:
        return jsonify({
            'status': 'error',
            'message': f'模板 {template_id} 不存在'
        }), 404

# 保存图表图像
@app.route('/api/report/save_chart_image', methods=['POST'])
def save_chart_image():
    try:
        data = request.json
        image_data = data.get('image_data')
        chart_index = data.get('chart_index', 0)
        chart_type = data.get('chart_type', 'unknown')
        chart_title = data.get('chart_title', f'图表{chart_index + 1}')
        
        if not image_data:
            return jsonify({
                'status': 'error',
                'message': '图像数据不能为空'
            }), 400
        
        # 解析base64图像数据
        import base64
        import uuid
        from datetime import datetime
        
        # 移除data:image/png;base64,前缀
        if image_data.startswith('data:image/'):
            image_data = image_data.split(',')[1]
        
        # 解码base64数据
        image_bytes = base64.b64decode(image_data)
        
        # 生成唯一文件名
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'chart_{timestamp}_{chart_index}_{chart_type}.png'
        
        # 确保reports/images目录存在
        reports_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
        images_dir = os.path.join(reports_dir, 'images')
        os.makedirs(images_dir, exist_ok=True)
        
        # 保存图像文件
        image_path = os.path.join(images_dir, filename)
        with open(image_path, 'wb') as f:
            f.write(image_bytes)
        
        return jsonify({
            'status': 'success',
            'image_path': image_path,
            'filename': filename,
            'chart_type': chart_type,
            'chart_title': chart_title
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'保存图表图像失败: {str(e)}'
        }), 500

# AI报告生成接口
@app.route('/api/report/generate_ai', methods=['POST'])
def generate_ai_report():
    try:
        data = request.get_json()
        
        # 提取参数
        api_key = data.get('api_key')
        scope = data.get('scope', 'all_students')
        targets = data.get('targets', [])
        analysis_types = data.get('analysis_types', ['knowledge'])
        analysis_data = data.get('analysis_data', {})
        custom_prompt = data.get('custom_prompt', '')
        chart_images = data.get('chart_images', {})
        chart_types = data.get('chart_types', [])
        chart_requirements = data.get('chart_requirements', [])
        
        # 设置API密钥
        if api_key:
            ai_report_service.set_api_key(api_key)
        
        # 根据scope选择生成方法
        if scope == 'single_student' and targets:
            student_id = targets[0]
            knowledge_data = analysis_data.get('knowledge', {})
            behavior_data = analysis_data.get('behavior', {})
            difficulty_data = analysis_data.get('difficulty', {})
            
            result = ai_report_service.generate_student_report(
                student_id=student_id,
                knowledge_data=knowledge_data,
                behavior_data=behavior_data,
                difficulty_data=difficulty_data
            )
        else:
            # 班级报告或其他情况
            result = ai_report_service.generate_class_report(
                class_data=targets,
                analysis_data=analysis_data
            )
        
        return jsonify(result)
        
    except Exception as e:
        print(f"AI报告生成失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'报告生成失败: {str(e)}'
        }), 500

# 生成多模态AI报告
@app.route('/api/report/generate_multimodal', methods=['POST'])
def generate_multimodal_ai_report():
    try:
        data = request.get_json()
        
        # 提取参数
        api_key = data.get('api_key')
        student_id = data.get('student_id')
        saved_charts = data.get('saved_charts', [])
        knowledge_data = data.get('knowledge_data')
        behavior_data = data.get('behavior_data')
        difficulty_data = data.get('difficulty_data')
        nlp_context = data.get('nlp_context', [])  # 新增NLP交互上下文
        
        if not student_id:
            return jsonify({
                'status': 'error',
                'message': '学生ID不能为空'
            }), 400
        
        if not saved_charts:
            return jsonify({
                'status': 'error',
                'message': '没有找到保存的图表，请先保存图表'
            }), 400
        
        # 设置API密钥
        if api_key:
            ai_report_service.set_api_key(api_key)
        
        # 调用多模态报告生成服务
        result = ai_report_service.generate_student_report_with_multimodal(
            student_id=student_id,
            saved_charts=saved_charts,
            knowledge_data=knowledge_data,
            behavior_data=behavior_data,
            difficulty_data=difficulty_data,
            nlp_context=nlp_context  # 传递NLP上下文
        )
        
        return jsonify(result)
        
    except Exception as e:
        print(f"多模态AI报告生成失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'多模态报告生成失败: {str(e)}'
        }), 500

# 设置AI报告API密钥
@app.route('/api/ai_report/set_api_key', methods=['POST'])
def set_ai_report_api_key():
    try:
        data = request.get_json()
        api_key = data.get('api_key')
        
        if not api_key:
            return jsonify({
                'status': 'error',
                'message': 'API密钥不能为空'
            }), 400
        
        # 设置API密钥
        success = ai_report_service.set_api_key(api_key)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': 'API密钥设置成功'
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'API密钥设置失败'
            }), 400
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'设置API密钥失败: {str(e)}'
        }), 500

# 获取AI报告历史记录
@app.route('/api/report/ai_history', methods=['GET'])
def get_ai_report_history():
    try:
        reports = ai_report_service.get_report_history()
        return jsonify({
            'status': 'success',
            'reports': reports
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'获取AI报告历史失败: {str(e)}'
        }), 500

# 访问报告图片
@app.route('/api/report/images/<path:filename>', methods=['GET'])
def get_report_image(filename):
    try:
        import os
        from flask import send_from_directory
        
        # 图片文件路径
        images_dir = os.path.join(os.path.dirname(__file__), 'reports', 'images')
        
        # 检查文件是否存在
        file_path = os.path.join(images_dir, filename)
        if not os.path.exists(file_path):
            return jsonify({
                'status': 'error',
                'message': '图片文件不存在'
            }), 404
        
        return send_from_directory(images_dir, filename)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'获取图片失败: {str(e)}'
        }), 500

# 获取指定AI报告
@app.route('/api/report/ai/<report_id>', methods=['GET'])
def get_ai_report(report_id):
    try:
        report = ai_report_service.get_report_by_id(report_id)
        if report:
            return jsonify({
                'status': 'success',
                'report': report
            })
        else:
            return jsonify({
                'status': 'error',
                'message': f'AI报告 {report_id} 不存在'
            }), 404
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'获取AI报告失败: {str(e)}'
        }), 500

# 删除AI报告
@app.route('/api/report/ai/<report_id>', methods=['DELETE'])
def delete_ai_report(report_id):
    try:
        success = ai_report_service.delete_report(report_id)
        if success:
            return jsonify({
                'status': 'success',
                'message': f'AI报告 {report_id} 已删除'
            })
        else:
            return jsonify({
                'status': 'error',
                'message': f'AI报告 {report_id} 不存在'
            }), 404
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'删除AI报告失败: {str(e)}'
        }), 500

# 下载AI报告
@app.route('/api/report/download', methods=['POST'])
def download_ai_report():
    try:
        import tempfile
        import time
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.units import inch
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        import re
        
        data = request.json
        content = data.get('content', '')
        filename = data.get('filename', f'report_{int(time.time())}.pdf')
        
        # 确保文件名以.pdf结尾
        if not filename.endswith('.pdf'):
            filename = filename.rsplit('.', 1)[0] + '.pdf'
        
        # 创建临时文件
        temp_file = os.path.join(tempfile.gettempdir(), filename)
        
        # 注册中文字体
        try:
            pdfmetrics.registerFont(TTFont('SimSun', 'C:\\Windows\\Fonts\\simsun.ttc'))
            pdfmetrics.registerFont(TTFont('SimHei', 'C:\\Windows\\Fonts\\simhei.ttf'))
            chinese_font = 'SimSun'
        except:
            chinese_font = 'Helvetica'  # 如果中文字体不可用，使用默认字体
        
        # 创建PDF文档
        doc = SimpleDocTemplate(temp_file, pagesize=A4)
        story = []
        
        # 获取样式
        styles = getSampleStyleSheet()
        
        # 定义自定义样式
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontName=chinese_font,
            fontSize=16,
            spaceAfter=12,
            alignment=1  # 居中
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontName=chinese_font,
            fontSize=14,
            spaceAfter=8
        )
        
        subheading_style = ParagraphStyle(
            'CustomSubHeading',
            parent=styles['Heading3'],
            fontName=chinese_font,
            fontSize=12,
            spaceAfter=6
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontName=chinese_font,
            fontSize=10,
            spaceAfter=6
        )
        
        # 解析Markdown内容并转换为PDF
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                story.append(Spacer(1, 6))
                continue
            
            # 处理标题
            if line.startswith('# '):
                story.append(Paragraph(line[2:], title_style))
            elif line.startswith('## '):
                story.append(Paragraph(line[3:], heading_style))
            elif line.startswith('### '):
                story.append(Paragraph(line[4:], subheading_style))
            elif line.startswith('#### '):
                story.append(Paragraph(line[5:], subheading_style))
            elif line.startswith('- '):
                # 处理列表项
                story.append(Paragraph('• ' + line[2:], normal_style))
            else:
                # 普通文本
                if line:
                    story.append(Paragraph(line, normal_style))
        
        # 生成PDF
        doc.build(story)
        
        return send_file(temp_file, as_attachment=True, download_name=filename, mimetype='application/pdf')
        
    except Exception as e:
        print(f"生成PDF报告失败: {e}")
        # 如果PDF生成失败，回退到文本文件
        try:
            import tempfile
            import time
            
            data = request.json
            content = data.get('content', '')
            filename = data.get('filename', f'report_{int(time.time())}.txt')
            
            # 创建临时文件
            temp_file = os.path.join(tempfile.gettempdir(), filename)
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return send_file(temp_file, as_attachment=True, download_name=filename)
        except Exception as fallback_e:
            return jsonify({
                'status': 'error',
                'message': f'下载报告失败: {str(fallback_e)}'
            }), 500

if __name__ == '__main__':
    # 确保报告目录存在
    report_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
    os.makedirs(report_dir, exist_ok=True)
    
    # 启动Flask应用
    app.run(debug=True, host='0.0.0.0', port=5000)