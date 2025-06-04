import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Select, Button, Table, Spin, Alert, Typography, Divider } from 'antd';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';

const { Option } = Select;
const { Title, Paragraph } = Typography;

const KnowledgeAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [knowledgeData, setKnowledgeData] = useState(null);
  const [weakPoints, setWeakPoints] = useState([]);
  const [overallAverages, setOverallAverages] = useState({});
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  
  // 加载学生数据
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/students');
        setStudents(response.data);
        setLoading(false);
      } catch (err) {
        console.error('加载学生数据失败:', err);
        setError('加载学生数据失败，请稍后重试');
        setLoading(false);
      }
    };
    
    fetchStudents();
  }, []);
  
  // 分析知识点掌握度
  const analyzeKnowledge = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = selectedStudent 
        ? `/api/analysis/knowledge?student_id=${selectedStudent}` 
        : '/api/analysis/knowledge';
      
      console.log('请求知识点分析数据:', url);
      const response = await axios.get(url);
      console.log('知识点分析响应:', response.data);
      
      if (response.data.status === 'success') {
        setKnowledgeData(response.data.knowledge_mastery);
        setWeakPoints(response.data.weak_points || []);
        setOverallAverages(response.data.overall_averages || []);
        
        // 获取时序数据
        await fetchTimeSeriesData();
      } else {
        setError(response.data.message || '分析失败');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('知识点分析失败:', err);
      setError('知识点分析失败，请稍后重试');
      setLoading(false);
    }
  };
  
  // 生成知识点掌握度雷达图配置
  const getKnowledgeRadarOption = () => {
    if (!knowledgeData) return {};
    
    const knowledgeNames = Object.keys(knowledgeData);
    const masteryLevels = knowledgeNames.map(name => (knowledgeData[name].mastery_level * 100).toFixed(2));
    const submissionRates = knowledgeNames.map(name => (knowledgeData[name].correct_submission_rate * 100).toFixed(2));
    
    // 获取全体学生平均数据
    const avgMasteryLevels = knowledgeNames.map(name => {
      if (overallAverages && overallAverages[name]) {
        return (overallAverages[name].avg_mastery_level * 100).toFixed(2);
      }
      return 0;
    });
    const avgSubmissionRates = knowledgeNames.map(name => {
      if (overallAverages && overallAverages[name]) {
        return (overallAverages[name].avg_correct_submission_rate * 100).toFixed(2);
      }
      return 0;
    });
    
    return {
      title: {
        text: '知识点掌握度雷达图',
        left: 'center'
      },
      tooltip: {
        trigger: 'item'
      },
      legend: {
        data: ['知识点掌握程度(%)', '正确提交率(%)', '全体平均掌握程度(%)', '全体平均正确提交率(%)'],
        bottom: -5
      },
      radar: {
        indicator: knowledgeNames.map(name => ({ name, max: 120 })) // 调整最大值到120使线条向外扩展
      },
      series: [
        {
          name: '知识点掌握度',
          type: 'radar',
          data: [
            {
              value: masteryLevels,
              name: '知识点掌握程度(%)',
              areaStyle: {
                color: 'rgba(24, 144, 255, 0.3)'
              },
              lineStyle: {
                color: '#1890ff'
              },
              itemStyle: {
                color: '#1890ff'
              }
            },
            {
              value: submissionRates,
              name: '正确提交率(%)',
              lineStyle: {
                color: '#52c41a'
              },
              itemStyle: {
                color: '#52c41a'
              }
            },
            {
              value: avgMasteryLevels,
              name: '全体平均掌握程度(%)',
              lineStyle: {
                color: '#87CEEB', // 淡蓝色
                type: 'dashed'
              },
              itemStyle: {
                color: '#87CEEB'
              }
            },
            {
              value: avgSubmissionRates,
              name: '全体平均正确提交率(%)',
              lineStyle: {
                color: '#90EE90', // 淡绿色
                type: 'dashed'
              },
              itemStyle: {
                color: '#90EE90'
              }
            }
          ]
        }
      ]
    };
  };
  
  // 获取时序数据
  const fetchTimeSeriesData = async () => {
    try {
      const url = selectedStudent 
        ? `/api/analysis/knowledge/timeseries?student_id=${selectedStudent}` 
        : '/api/analysis/knowledge/timeseries';
      
      console.log('请求时序数据:', url);
      const response = await axios.get(url);
      console.log('时序数据响应:', response.data);
      
      if (response.data.status === 'success') {
        setTimeSeriesData(response.data.timeseries_data);
      } else {
        console.warn('时序数据获取失败:', response.data.message);
        // 即使时序数据获取失败，也设置一个空对象，避免界面卡住
        setTimeSeriesData({});
      }
    } catch (err) {
      console.error('获取时序数据失败:', err);
      // 设置空对象，避免界面卡住
      setTimeSeriesData({});
    }
  };

  // 生成知识点掌握度时序折线图配置
  const getKnowledgeTimeSeriesOption = () => {
    if (!timeSeriesData || Object.keys(timeSeriesData).length === 0 || !knowledgeData) {
      // 如果没有时序数据，显示静态的掌握度对比
      const knowledgeNames = Object.keys(knowledgeData || {});
      const masteryLevels = knowledgeNames.map(name => (knowledgeData[name].mastery_level * 100).toFixed(2));
      
      return {
        title: {
          text: '知识点掌握度时序分析',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['当前掌握程度(%)'],
          bottom: 0
        },
        xAxis: {
          type: 'category',
          data: knowledgeNames,
          axisLabel: {
            rotate: 45,
            interval: 0
          }
        },
        yAxis: {
          type: 'value',
          name: '掌握程度(%)',
          min: 0,
          max: 100
        },
        series: [{
          name: '当前掌握程度(%)',
          type: 'line',
          data: masteryLevels,
          itemStyle: {
            color: '#1890ff'
          },
          lineStyle: {
            color: '#1890ff'
          }
        }]
      };
    }
    
    // 处理时序数据
    const series = [];
    const allTimestamps = new Set();
    const colors = ['#1890ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2', '#a0d911', '#fa541c'];
    let colorIndex = 0;
    
    // 收集所有时间戳
    Object.keys(timeSeriesData).forEach(knowledge => {
      if (timeSeriesData[knowledge].timeline && Array.isArray(timeSeriesData[knowledge].timeline)) {
        timeSeriesData[knowledge].timeline.forEach(point => {
          if (point && point.timestamp) {
            allTimestamps.add(point.timestamp);
          }
        });
      }
      
      if (timeSeriesData[knowledge].sub_knowledge) {
        Object.keys(timeSeriesData[knowledge].sub_knowledge).forEach(subKnowledge => {
          const subData = timeSeriesData[knowledge].sub_knowledge[subKnowledge];
          if (subData && subData.timeline && Array.isArray(subData.timeline)) {
            subData.timeline.forEach(point => {
              if (point && point.timestamp) {
                allTimestamps.add(point.timestamp);
              }
            });
          }
        });
      }
    });
    
    // 转换为排序的时间戳数组
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    // 选择关键时间点（改进的智能选择算法）
    const getKeyTimePoints = (timestamps) => {
      if (timestamps.length <= 15) {
        // 如果时间点较少，全部显示
        return timestamps;
      }
      
      const keyPoints = [];
      const totalPoints = timestamps.length;
      
      // 始终包含第一个时间点
      keyPoints.push(timestamps[0]);
      
      // 计算每个知识点在每个时间点的掌握度
      const masteryByTimestamp = {};
      
      // 收集所有时间点的掌握度数据
      Object.keys(timeSeriesData).forEach(knowledge => {
        if (timeSeriesData[knowledge].timeline) {
          timeSeriesData[knowledge].timeline.forEach(point => {
            if (!masteryByTimestamp[point.timestamp]) {
              masteryByTimestamp[point.timestamp] = [];
            }
            masteryByTimestamp[point.timestamp].push(point.mastery_level);
          });
        }
        
        // 子知识点
        if (timeSeriesData[knowledge].sub_knowledge) {
          Object.keys(timeSeriesData[knowledge].sub_knowledge).forEach(subKnowledge => {
            const subData = timeSeriesData[knowledge].sub_knowledge[subKnowledge];
            if (subData && subData.timeline) {
              subData.timeline.forEach(point => {
                if (!masteryByTimestamp[point.timestamp]) {
                  masteryByTimestamp[point.timestamp] = [];
                }
                masteryByTimestamp[point.timestamp].push(point.mastery_level);
              });
            }
          });
        }
      });
      
      // 计算每个时间点的平均掌握度
      const avgMasteryByTimestamp = {};
      Object.keys(masteryByTimestamp).forEach(timestamp => {
        const values = masteryByTimestamp[timestamp];
        avgMasteryByTimestamp[timestamp] = values.reduce((sum, val) => sum + val, 0) / values.length;
      });
      
      if (totalPoints <= 30) {
        // 对于中等数量的时间点，选择更多的均匀分布点
        const step = Math.max(Math.floor(totalPoints / 15), 1);
        for (let i = step; i < totalPoints - 1; i += step) {
          keyPoints.push(timestamps[i]);
        }
      } else {
        // 对于大量时间点，使用更智能的选择策略
        const segments = 15; // 增加段数以显示更多点
        const segmentSize = Math.floor(totalPoints / segments);
        
        for (let i = 1; i < segments; i++) {
          const segmentStart = i * segmentSize;
          const segmentEnd = Math.min((i + 1) * segmentSize, totalPoints);
          
          // 在每个段中选择中间的时间点
          const midIndex = Math.floor((segmentStart + segmentEnd) / 2);
          if (midIndex < totalPoints && !keyPoints.includes(timestamps[midIndex])) {
            keyPoints.push(timestamps[midIndex]);
          }
          
          // 在每个段中找出掌握度变化最大的点
          let maxChange = 0;
          let maxChangeIndex = -1;
          
          for (let j = segmentStart + 1; j < segmentEnd; j++) {
            const currTimestamp = timestamps[j];
            const prevTimestamp = timestamps[j - 1];
            
            if (avgMasteryByTimestamp[currTimestamp] !== undefined && 
                avgMasteryByTimestamp[prevTimestamp] !== undefined) {
              const change = Math.abs(avgMasteryByTimestamp[currTimestamp] - avgMasteryByTimestamp[prevTimestamp]);
              if (change > maxChange) {
                maxChange = change;
                maxChangeIndex = j;
              }
            }
          }
          
          // 如果找到了变化显著的点，并且不是已选的中点，则添加
          if (maxChangeIndex > 0 && maxChangeIndex !== midIndex && !keyPoints.includes(timestamps[maxChangeIndex])) {
            keyPoints.push(timestamps[maxChangeIndex]);
          }
        }
      }
      
      // 始终包含最后一个时间点
      if (!keyPoints.includes(timestamps[totalPoints - 1])) {
        keyPoints.push(timestamps[totalPoints - 1]);
      }
      
      // 确保时间点按顺序排列
      return keyPoints.sort((a, b) => a - b);
    };
    
    const keyTimestamps = getKeyTimePoints(sortedTimestamps);
    
    // 格式化时间显示
    const formatTime = (timestamp) => {
      const date = new Date(timestamp * 1000);
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // 今天，只显示时间
        return date.toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (diffDays < 7) {
        // 一周内，显示月日和时间
        return date.toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        // 超过一周，显示年月日
        return date.toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          year: '2-digit',
          month: '2-digit',
          day: '2-digit'
        });
      }
    };
    
    const timeLabels = keyTimestamps.map(formatTime);
    
    // 为每个知识点和子知识点创建折线
    Object.keys(timeSeriesData).forEach(knowledge => {
      if (!knowledge || knowledge === 'undefined' || knowledge === '未知') {
        return; // 跳过无效的知识点
      }
      
      const knowledgeColor = colors[colorIndex % colors.length];
      colorIndex++;
      
      // 主知识点折线
      if (timeSeriesData[knowledge].timeline && Array.isArray(timeSeriesData[knowledge].timeline)) {
        const timeline = timeSeriesData[knowledge].timeline;
        
        // 改进的数据映射逻辑，使用最近的有效数据点
        const data = keyTimestamps.map(timestamp => {
          // 首先尝试找到精确匹配的时间点
          let point = timeline.find(p => p && p.timestamp === timestamp);
          
          if (!point) {
            // 如果没有精确匹配，找到最近的较早时间点
            const earlierPoints = timeline.filter(p => p && p.timestamp <= timestamp);
            if (earlierPoints.length > 0) {
              point = earlierPoints[earlierPoints.length - 1]; // 最近的较早点
            }
          }
          
          return point && point.mastery_level !== undefined ? 
            parseFloat((point.mastery_level * 100).toFixed(2)) : null;
        });
        
        // 只有当数据中有有效值时才添加系列
        if (data.some(val => val !== null)) {
          series.push({
            name: knowledge,
            type: 'line',
            data: data,
            itemStyle: { color: knowledgeColor },
            lineStyle: { color: knowledgeColor, width: 3 },
            symbol: 'circle',
            symbolSize: 6,
            connectNulls: true // 连接null值，使折线更连续
          });
        }
      }
      
      // 子知识点折线
      if (timeSeriesData[knowledge].sub_knowledge) {
        Object.keys(timeSeriesData[knowledge].sub_knowledge).forEach(subKnowledge => {
          if (!subKnowledge || subKnowledge === 'undefined' || subKnowledge === '未知') {
            return; // 跳过无效的子知识点
          }
          
          const subData = timeSeriesData[knowledge].sub_knowledge[subKnowledge];
          if (subData && subData.timeline && Array.isArray(subData.timeline)) {
            const timeline = subData.timeline;
            // 改进的子知识点数据映射逻辑
            const data = keyTimestamps.map(timestamp => {
              // 首先尝试找到精确匹配的时间点
              let point = timeline.find(p => p && p.timestamp === timestamp);
              
              if (!point) {
                // 如果没有精确匹配，找到最近的较早时间点
                const earlierPoints = timeline.filter(p => p && p.timestamp <= timestamp);
                if (earlierPoints.length > 0) {
                  point = earlierPoints[earlierPoints.length - 1]; // 最近的较早点
                }
              }
              
              return point && point.mastery_level !== undefined ? 
                parseFloat((point.mastery_level * 100).toFixed(2)) : null;
            });
            
            // 只有当数据中有有效值时才添加系列
            if (data.some(val => val !== null)) {
              series.push({
                name: `${knowledge}-${subKnowledge}`,
                type: 'line',
                data: data,
                itemStyle: { color: knowledgeColor },
                lineStyle: { 
                  color: knowledgeColor, 
                  type: 'dashed',
                  width: 2
                },
                symbol: 'diamond',
                symbolSize: 4,
                connectNulls: true // 连接null值，使折线更连续
              });
            }
          }
        });
      }
    });
    
    return {
      title: {
        text: '知识点掌握度时序分析',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#ccc',
        borderWidth: 1,
        textStyle: {
          color: '#333'
        },
        formatter: function(params) {
          if (!params || params.length === 0) return '';
          
          // 获取时间点
          const timePoint = params[0].axisValue;
          let result = `<div style="font-weight:bold;margin-bottom:5px;">${timePoint}</div>`;
          
          // 按知识点分组显示
          const knowledgeGroups = {};
          
          params.forEach(param => {
            if (param.value !== null && param.value !== undefined) {
              const isSubKnowledge = param.seriesName.includes('-');
              const parts = isSubKnowledge ? param.seriesName.split('-') : [param.seriesName];
              const mainKnowledge = parts[0];
              
              if (!knowledgeGroups[mainKnowledge]) {
                knowledgeGroups[mainKnowledge] = [];
              }
              
              knowledgeGroups[mainKnowledge].push({
                name: param.seriesName,
                value: param.value,
                color: param.color,
                isSubKnowledge: isSubKnowledge
              });
            }
          });
          
          // 构建分组显示的HTML
          Object.keys(knowledgeGroups).forEach(knowledge => {
            const items = knowledgeGroups[knowledge];
            const mainItem = items.find(item => !item.isSubKnowledge);
            
            if (mainItem) {
              result += `<div style="margin-top:5px;">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${mainItem.color};margin-right:5px;"></span>
                <span style="font-weight:bold;">${mainItem.name}: ${mainItem.value}%</span>
              </div>`;
            }
            
            // 显示子知识点
            items.filter(item => item.isSubKnowledge).forEach(subItem => {
              const subName = subItem.name.split('-')[1];
              result += `<div style="padding-left:15px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${subItem.color};margin-right:5px;opacity:0.8;"></span>
                <span>${subName}: ${subItem.value}%</span>
              </div>`;
            });
          });
          
          return result;
        }
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        bottom: 5,
        data: series.map(s => s.name),
        textStyle: {
          fontSize: 12
        },
        pageButtonItemGap: 5,
        pageButtonGap: 15,
        pageIconSize: 12,
        pageIconColor: '#1890ff',
        pageIconInactiveColor: '#ccc',
        pageTextStyle: {
          color: '#333'
        },
        formatter: function(name) {
          // 对于子知识点，只显示子知识点名称
          if (name.includes('-')) {
            return name.split('-')[1];
          }
          return name;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '20%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLabel: {
          rotate: 45,
          interval: 0,
          fontSize: 10,
          color: '#666',
          formatter: function(value) {
            // 限制标签长度，避免重叠
            if (value.length > 10) {
              return value.substring(0, 10) + '...';
            }
            return value;
          }
        },
        axisTick: {
          alignWithLabel: true
        },
        axisLine: {
          lineStyle: {
            color: '#ccc'
          }
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: '掌握程度(%)',
        nameTextStyle: {
          fontSize: 12,
          padding: [0, 0, 0, 5]
        },
        min: 0,
        max: 100,
        interval: 20,
        axisLabel: {
          formatter: '{value}%',
          fontSize: 10,
          color: '#666'
        },
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#eee'
          }
        }
      },
      series: series,
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          start: 0,
          end: 100,
          height: 20,
          bottom: 60,
          borderColor: '#ddd',
          fillerColor: 'rgba(24, 144, 255, 0.2)',
          handleIcon: 'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
          handleSize: '80%',
          handleStyle: {
            color: '#fff',
            shadowBlur: 3,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
            shadowOffsetX: 2,
            shadowOffsetY: 2
          },
          textStyle: {
            color: '#999'
          }
        },
        {
          type: 'inside',
          xAxisIndex: [0],
          zoomOnMouseWheel: true,
          moveOnMouseMove: true
        }
      ]
    };
  };
  
  // 从属知识点表格列定义
  const subKnowledgeColumns = [
    {
      title: '知识点',
      dataIndex: 'knowledge',
      key: 'knowledge',
    },
    {
      title: '从属知识点',
      dataIndex: 'sub_knowledge',
      key: 'sub_knowledge',
    },
    {
      title: '正确率',
      dataIndex: 'correct_rate',
      key: 'correct_rate',
      render: (text) => `${(text * 100).toFixed(2)}%`,
      sorter: (a, b) => a.correct_rate - b.correct_rate,
    },
    {
      title: '正确提交率',
      dataIndex: 'correct_submission_rate',
      key: 'correct_submission_rate',
      render: (text) => `${(text * 100).toFixed(2)}%`,
      sorter: (a, b) => a.correct_submission_rate - b.correct_submission_rate,
    },
    {
      title: '平均用时(秒)',
      dataIndex: 'avg_time_consume',
      key: 'avg_time_consume',
      render: (text) => text.toFixed(2),
      sorter: (a, b) => a.avg_time_consume - b.avg_time_consume,
    },
    {
      title: '总提交次数',
      dataIndex: 'total_submissions',
      key: 'total_submissions',
      sorter: (a, b) => a.total_submissions - b.total_submissions,
    },
    {
      title: '正确提交次数',
      dataIndex: 'correct_submissions',
      key: 'correct_submissions',
      sorter: (a, b) => a.correct_submissions - b.correct_submissions,
    },
  ];
  
  // 薄弱环节表格列定义
  const weakPointsColumns = [
    {
      title: '知识点',
      dataIndex: 'knowledge',
      key: 'knowledge',
    },
    {
      title: '从属知识点',
      dataIndex: 'sub_knowledge',
      key: 'sub_knowledge',
      render: (text) => text || '-',
    },
    {
      title: '正确率',
      dataIndex: 'correct_rate',
      key: 'correct_rate',
      render: (text) => `${(text * 100).toFixed(2)}%`,
      sorter: (a, b) => a.correct_rate - b.correct_rate,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
    },
  ];
  
  // 准备从属知识点表格数据
  const getSubKnowledgeData = () => {
    if (!knowledgeData) return [];
    
    const tableData = [];
    
    Object.entries(knowledgeData).forEach(([knowledge, data]) => {
      if (data.sub_knowledge) {
        Object.entries(data.sub_knowledge).forEach(([sub_knowledge, sub_data]) => {
          tableData.push({
            key: `${knowledge}-${sub_knowledge}`,
            knowledge,
            sub_knowledge,
            ...sub_data
          });
        });
      }
    });
    
    return tableData;
  };
  
  return (
    <div>
      <Title level={2}>知识点掌握度分析</Title>
      <Paragraph>
        本模块分析学习者答题行为日志记录，从答题分数、答题状态等多维度属性量化评估知识点掌握程度，并识别其知识体系中存在的薄弱环节。
      </Paragraph>
      
      <Card className="filter-form">
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="选择学生"
              style={{ width: '100%' }}
              allowClear
              onChange={setSelectedStudent}
              loading={loading}
            >
              {students.map(student => (
                <Option key={student.student_ID} value={student.student_ID}>
                  {student.student_ID} {student.sex ? `(${student.sex})` : ''}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} style={{ marginTop: { xs: '10px', sm: '0' } }}>
            <Button type="primary" onClick={analyzeKnowledge} loading={loading}>
              分析
            </Button>
          </Col>
        </Row>
      </Card>
      
      {error && <Alert message="错误" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      
      {loading ? (
        <Spin tip="分析中..." size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }} />
      ) : knowledgeData ? (
        <>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Card className="chart-card" title="知识点掌握度雷达图">
                <ReactECharts
                  option={getKnowledgeRadarOption()}
                  style={{ height: '300px', width: '100%' }}
                  className="chart-container"
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="chart-card" title="知识点掌握度时序分析">
                <ReactECharts
                  option={getKnowledgeTimeSeriesOption()}
                  style={{ height: '400px', width: '100%' }}
                  className="chart-container"
                />
              </Card>
            </Col>
          </Row>
          
          <Divider orientation="left">从属知识点掌握情况</Divider>
          <Table 
            columns={subKnowledgeColumns} 
            dataSource={getSubKnowledgeData()} 
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 5 }}
            className="data-table"
          />
          
          {weakPoints.length > 0 && (
            <>
              <Divider orientation="left">薄弱环节分析</Divider>
              <Alert
                message="发现知识薄弱环节"
                description="以下知识点或从属知识点的掌握程度较低，建议加强学习。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Table 
                columns={weakPointsColumns} 
                dataSource={weakPoints.map((item, index) => ({ ...item, key: index }))} 
                pagination={{ pageSize: 5 }}
                className="data-table"
              />
            </>
          )}
        </>
      ) : null}
    </div>
  );
};

export default KnowledgeAnalysis;