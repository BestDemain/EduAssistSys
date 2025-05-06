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

app = Flask(__name__)
CORS(app)  # 启用跨域请求支持

# 初始化服务
data_service = DataService()
analysis_service = AnalysisService()
report_service = ReportService()
nlp_service = NLPService()

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

# 题目难度分析
@app.route('/api/analysis/difficulty', methods=['GET'])
def analyze_difficulty():
    result = analysis_service.analyze_question_difficulty()
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

# 自然语言查询接口
@app.route('/api/nlp/query', methods=['POST'])
def nlp_query():
    data = request.json
    query = data.get('query', '')
    result = nlp_service.process_query(query)
    return jsonify(result)

if __name__ == '__main__':
    # 确保报告目录存在
    report_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
    os.makedirs(report_dir, exist_ok=True)
    
    # 启动Flask应用
    app.run(debug=True, host='0.0.0.0', port=5000)