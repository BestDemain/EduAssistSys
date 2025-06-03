import pandas as pd
import numpy as np
import os
from pathlib import Path

def calculate_mastery(state, score, total_score):
    """
    根据分段计算法计算学生对题目的掌握程度
    
    Args:
        state: 答题状态
        score: 获得分数
        total_score: 题目总分
    
    Returns:
        掌握程度值 (0.0-1.0)
    """
    # 处理缺失值和异常值
    if pd.isna(state) or pd.isna(score) or pd.isna(total_score):
        return 0.0
    
    # 确保分数为数值类型
    try:
        score = float(score)
        total_score = float(total_score)
    except (ValueError, TypeError):
        return 0.0
    
    # 计算分数占比
    score_ratio = score / total_score if total_score > 0 else 0.0
    
    # 处理状态字符串，去除可能的空格和转换为字符串
    state = str(state).strip()
    
    # 分段计算掌握程度
    if state == "Absolutely_Correct":
        return 1.0
    elif state == "Partially_Correct":
        return score_ratio
    elif state.startswith("Error") and state != "Absolutely_Error":
        # Error1, Error2, ..., Error9
        return 0.1 + 0.2 * score_ratio
    else:  # Absolutely_Error 或其他未知状态
        return 0.0

def process_submit_records():
    """
    处理所有提交记录文件，添加Mastery列
    """
    # 数据目录路径
    data_dir = Path("d:/Vscode/Project/VisualAnalytics/EduAssistSys/Data")
    submit_dir = data_dir / "Data_SubmitRecord"
    title_info_path = data_dir / "Data_TitleInfo.csv"
    
    # 读取题目信息
    print("正在读取题目信息...")
    title_info = pd.read_csv(title_info_path)
    
    # 创建题目ID到总分的映射字典
    title_scores = {}
    for _, row in title_info.iterrows():
        title_id = row['title_ID']
        score = row['score']
        if title_id not in title_scores:
            title_scores[title_id] = score
        else:
            # 如果同一题目有多个记录，取最大分数
            title_scores[title_id] = max(title_scores[title_id], score)
    
    print(f"共找到 {len(title_scores)} 个题目的分数信息")
    
    # 处理所有提交记录文件
    submit_files = list(submit_dir.glob("SubmitRecord-*.csv"))
    print(f"找到 {len(submit_files)} 个提交记录文件")
    
    for file_path in submit_files:
        print(f"\n正在处理文件: {file_path.name}")
        
        try:
            # 读取提交记录
            df = pd.read_csv(file_path)
            print(f"  - 原始记录数: {len(df)}")
            
            # 检查是否已存在Mastery列
            if 'Mastery' in df.columns:
                print("  - Mastery列已存在，将重新计算")
            
            # 计算掌握程度
            mastery_values = []
            for _, row in df.iterrows():
                title_id = row['title_ID']
                state = row['state']
                score = row['score']
                
                # 获取题目总分
                total_score = title_scores.get(title_id, 0)
                
                # 计算掌握程度
                mastery = calculate_mastery(state, score, total_score)
                mastery_values.append(mastery)
            
            # 添加Mastery列
            df['Mastery'] = mastery_values
            
            # 保存文件
            df.to_csv(file_path, index=False)
            print(f"  - 已添加Mastery列并保存")
            
            # 显示统计信息
            mastery_stats = pd.Series(mastery_values).describe()
            print(f"  - Mastery统计: 平均值={mastery_stats['mean']:.3f}, 最小值={mastery_stats['min']:.3f}, 最大值={mastery_stats['max']:.3f}")
            
        except Exception as e:
            print(f"  - 处理文件时出错: {str(e)}")
            continue
    
    print("\n所有文件处理完成！")

if __name__ == "__main__":
    process_submit_records()