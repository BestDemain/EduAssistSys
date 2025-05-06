# 数据服务模块 - 负责数据加载和预处理

import os
import pandas as pd
import numpy as np
from pathlib import Path

class DataService:
    def __init__(self):
        # 获取项目根目录
        self.root_dir = Path(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        self.data_dir = self.root_dir / 'Data'
        
        # 数据缓存
        self._students_data = None
        self._questions_data = None
        self._submissions_data = {}
        
        # 初始化时加载基本数据
        self._load_students_data()
        self._load_questions_data()
    
    def _load_students_data(self):
        """加载学生信息数据"""
        try:
            file_path = self.data_dir / 'Data_StudentInfo.csv'
            self._students_data = pd.read_csv(file_path)
            print(f"已加载{len(self._students_data)}条学生数据")
        except Exception as e:
            print(f"加载学生数据失败: {e}")
            self._students_data = pd.DataFrame()
    
    def _load_questions_data(self):
        """加载题目信息数据"""
        try:
            file_path = self.data_dir / 'Data_TitleInfo.csv'
            self._questions_data = pd.read_csv(file_path)
            print(f"已加载{len(self._questions_data)}条题目数据")
        except Exception as e:
            print(f"加载题目数据失败: {e}")
            self._questions_data = pd.DataFrame()
    
    def _load_submissions_data(self, class_id):
        """加载指定班级的提交记录数据"""
        if class_id in self._submissions_data:
            return
            
        try:
            file_path = self.data_dir / 'Data_SubmitRecord' / f'SubmitRecord-{class_id}.csv'
            self._submissions_data[class_id] = pd.read_csv(file_path)
            print(f"已加载{class_id}的{len(self._submissions_data[class_id])}条提交记录")
        except Exception as e:
            print(f"加载{class_id}提交记录失败: {e}")
            self._submissions_data[class_id] = pd.DataFrame()
    
    def get_students(self, filters=None):
        """获取学生信息，可选过滤条件"""
        if self._students_data is None:
            self._load_students_data()
            
        if filters:
            # 应用过滤条件
            filtered_data = self._students_data
            for key, value in filters.items():
                if key in self._students_data.columns:
                    filtered_data = filtered_data[filtered_data[key] == value]
            return filtered_data.to_dict('records')
        
        return self._students_data.to_dict('records')
    
    def get_questions(self, filters=None):
        """获取题目信息，可选过滤条件"""
        if self._questions_data is None:
            self._load_questions_data()
            
        if filters:
            # 应用过滤条件
            filtered_data = self._questions_data
            for key, value in filters.items():
                if key in self._questions_data.columns:
                    filtered_data = filtered_data[filtered_data[key] == value]
            return filtered_data.to_dict('records')
        
        return self._questions_data.to_dict('records')
    
    def get_submissions(self, class_id='Class1', student_id=None):
        """获取提交记录，可按班级和学生ID过滤"""
        if class_id not in self._submissions_data:
            self._load_submissions_data(class_id)
        
        submissions = self._submissions_data.get(class_id, pd.DataFrame())
        
        if student_id and not submissions.empty:
            submissions = submissions[submissions['student_ID'] == student_id]
        
        return submissions.to_dict('records')
    
    def get_all_submissions(self):
        """获取所有班级的提交记录（按需加载）"""
        # 获取所有班级文件名
        submit_dir = self.data_dir / 'Data_SubmitRecord'
        class_files = [f.name for f in submit_dir.glob('SubmitRecord-*.csv')]
        class_ids = [f.split('-')[1].split('.')[0] for f in class_files]
        
        # 加载所有班级数据
        all_submissions = []
        for class_id in class_ids:
            if class_id not in self._submissions_data:
                self._load_submissions_data(class_id)
            all_submissions.append(self._submissions_data.get(class_id, pd.DataFrame()))
        
        # 合并所有数据
        if all_submissions:
            return pd.concat(all_submissions).to_dict('records')
        return []
    
    def get_knowledge_structure(self):
        """获取知识点结构"""
        if self._questions_data is None:
            self._load_questions_data()
            
        # 提取知识点和从属知识点的关系
        knowledge_data = self._questions_data[['knowledge', 'sub_knowledge']].drop_duplicates()
        
        # 构建知识点结构
        knowledge_structure = {}
        for _, row in knowledge_data.iterrows():
            main_knowledge = row['knowledge']
            sub_knowledge = row['sub_knowledge']
            
            if main_knowledge not in knowledge_structure:
                knowledge_structure[main_knowledge] = []
            
            if sub_knowledge not in knowledge_structure[main_knowledge]:
                knowledge_structure[main_knowledge].append(sub_knowledge)
        
        return knowledge_structure