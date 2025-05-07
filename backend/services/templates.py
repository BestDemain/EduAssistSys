# 报告模板服务模块 - 负责管理报告模板

import os
import json
from pathlib import Path
from datetime import datetime

class TemplateService:
    def __init__(self):
        # 模板保存目录
        self.template_dir = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) / 'templates'
        os.makedirs(self.template_dir, exist_ok=True)
        
        # 初始化默认模板
        self._init_default_templates()
    
    def _init_default_templates(self):
        """初始化默认模板"""
        # 检查默认模板是否已存在
        if not list(self.template_dir.glob('*.json')):
            # 创建默认知识点掌握度报告模板
            knowledge_template = {
                'id': 'knowledge_default',
                'name': '知识点掌握度分析报告模板',
                'type': 'knowledge',
                'created_at': datetime.now().isoformat(),
                'sections': [
                    {
                        'title': '知识点掌握概览',
                        'type': 'chart',
                        'chart_type': 'radar',
                        'data_source': 'knowledge_mastery'
                    },
                    {
                        'title': '知识点详细分析',
                        'type': 'table',
                        'data_source': 'knowledge_details'
                    },
                    {
                        'title': '薄弱环节分析',
                        'type': 'text',
                        'data_source': 'weak_points'
                    }
                ]
            }
            
            # 创建默认学习行为报告模板
            behavior_template = {
                'id': 'behavior_default',
                'name': '学习行为分析报告模板',
                'type': 'behavior',
                'created_at': datetime.now().isoformat(),
                'sections': [
                    {
                        'title': '答题时间分布',
                        'type': 'chart',
                        'chart_type': 'bar',
                        'data_source': 'peak_hours'
                    },
                    {
                        'title': '答题状态分布',
                        'type': 'chart',
                        'chart_type': 'pie',
                        'data_source': 'state_distribution'
                    },
                    {
                        'title': '学习行为模式分析',
                        'type': 'text',
                        'data_source': 'behavior_patterns'
                    }
                ]
            }
            
            # 创建默认题目难度报告模板
            difficulty_template = {
                'id': 'difficulty_default',
                'name': '题目难度分析报告模板',
                'type': 'difficulty',
                'created_at': datetime.now().isoformat(),
                'sections': [
                    {
                        'title': '题目难度分布',
                        'type': 'chart',
                        'chart_type': 'histogram',
                        'data_source': 'difficulty_distribution'
                    },
                    {
                        'title': '难度异常题目分析',
                        'type': 'table',
                        'data_source': 'abnormal_questions'
                    },
                    {
                        'title': '难度建议',
                        'type': 'text',
                        'data_source': 'difficulty_suggestions'
                    }
                ]
            }
            
            # 保存默认模板
            self.save_template(knowledge_template)
            self.save_template(behavior_template)
            self.save_template(difficulty_template)
    
    def get_templates(self, template_type=None):
        """获取所有模板或指定类型的模板
        
        Args:
            template_type: 模板类型，可选值：'knowledge', 'behavior', 'difficulty'
            
        Returns:
            模板列表
        """
        templates = []
        
        # 读取所有模板文件
        for template_file in self.template_dir.glob('*.json'):
            with open(template_file, 'r', encoding='utf-8') as f:
                template = json.load(f)
                
                # 如果指定了类型，则只返回该类型的模板
                if template_type is None or template.get('type') == template_type:
                    templates.append(template)
        
        return templates
    
    def get_template(self, template_id):
        """获取指定ID的模板
        
        Args:
            template_id: 模板ID
            
        Returns:
            模板数据，如果不存在则返回None
        """
        template_file = self.template_dir / f"{template_id}.json"
        
        if template_file.exists():
            with open(template_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        return None
    
    def save_template(self, template):
        """保存模板
        
        Args:
            template: 模板数据
            
        Returns:
            保存后的模板ID
        """
        # 确保模板有ID
        if 'id' not in template:
            template['id'] = f"{template.get('type', 'general')}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # 确保模板有创建时间
        if 'created_at' not in template:
            template['created_at'] = datetime.now().isoformat()
        
        # 保存模板文件
        template_file = self.template_dir / f"{template['id']}.json"
        with open(template_file, 'w', encoding='utf-8') as f:
            json.dump(template, f, ensure_ascii=False, indent=2)
        
        return template['id']
    
    def delete_template(self, template_id):
        """删除模板
        
        Args:
            template_id: 模板ID
            
        Returns:
            是否删除成功
        """
        template_file = self.template_dir / f"{template_id}.json"
        
        if template_file.exists():
            template_file.unlink()
            return True
        
        return False