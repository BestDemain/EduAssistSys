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

app = Flask(__name__)
CORS(app)  # 启用跨域请求支持

# 初始化服务
data_service = DataService()
analysis_service = AnalysisService()
report_service = ReportService()
nlp_service = NLPService()
template_service = TemplateService()

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

# 学习行为模式分析
@app.route('/api/analysis/behavior', methods=['GET'])
def analyze_behavior():
    student_id = request.args.get('student_id', None)
    result = analysis_service.analyze_learning_behavior(student_id)
    return jsonify(result)

# 获取掌握趋势分析
@app.route('/api/analysis/mastery_trend', methods=['GET'])
def analyze_mastery_trend():
    student_id = request.args.get('student_id', None)
    granularity = request.args.get('granularity', 'day')
    group_by = request.args.get('group_by', 'knowledge')
    result = analysis_service.analyze_mastery_trend(student_id, granularity, group_by)
    # 递归转换 numpy.int64 为 int，防止前端解析问题
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

# 生成掌握程度分析文件
@app.route('/api/analysis/mastery/files', methods=['GET'])
def generate_mastery_files():
    result = analysis_service.generate_mastery_files()
    return jsonify(result)

# 分析题目难度与知识掌握程度的匹配性
@app.route('/api/analysis/difficulty-mastery-match', methods=['GET'])
def analyze_difficulty_mastery_match():
    result = analysis_service.analyze_difficulty_mastery_match()
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

if __name__ == '__main__':
    # 确保报告目录存在
    report_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
    os.makedirs(report_dir, exist_ok=True)
    
    # 启动Flask应用
    app.run(debug=True, host='0.0.0.0', port=5000)