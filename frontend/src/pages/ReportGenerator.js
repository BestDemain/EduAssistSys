import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  Tabs, 
  Space, 
  Row, 
  Col, 
  message,
  Typography,
  Spin,
  Alert,
  Statistic,
  Tag,
  Radio,
  Divider,
  List
} from 'antd';
import { 
  UserOutlined, 
  LoadingOutlined, 
  EyeOutlined, 
  BarChartOutlined, 
  BulbOutlined, 
  ThunderboltOutlined,
  TeamOutlined,
  SaveOutlined,
  PictureOutlined,
  SendOutlined,
  RobotOutlined,
  MessageOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

const { Option } = Select;
const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

const ReportGenerator = () => {
  const [apiKey, setApiKey] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [generatedReport, setGeneratedReport] = useState('');
  const [reportWithCharts, setReportWithCharts] = useState('');
  const [error, setError] = useState(null);
  const [savingCharts, setSavingCharts] = useState(false);
  const [savedCharts, setSavedCharts] = useState([]);
  
  // NLP交互相关状态
  const [nlpQuery, setNlpQuery] = useState('');
  const [nlpMessages, setNlpMessages] = useState([]);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [modelType, setModelType] = useState('backend');
  const [showNlpModule, setShowNlpModule] = useState(false);
  const messagesEndRef = useRef(null);
  
  // 图表引用
  const knowledgeRadarRef = useRef(null);
  const behaviorHourRef = useRef(null);
  const behaviorWeekRef = useRef(null);
  const behaviorStateRef = useRef(null);
  const behaviorMethodRef = useRef(null);
  const difficultyRef = useRef(null);
  const knowledgeTimeSeriesRef = useRef(null);
  
  // 时间分布图表显示模式
  const [timeDistributionMode, setTimeDistributionMode] = useState('hour');
  
  // 状态/方法分布图表显示模式
  const [stateMethodMode, setStateMethodMode] = useState('state');

  // 获取学生列表
  useEffect(() => {
    fetchStudents();
  }, []);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [nlpMessages]);

  // 初始化NLP欢迎消息
  const initializeNlpMessages = () => {
    setNlpMessages([
      {
        type: 'system',
        content: `欢迎使用智能分析助手！当前已选择学生ID: ${selectedStudent}。您可以询问关于该学生的学习情况，例如：\n\n• "分析这个学生的知识点掌握情况"\n• "查看学习行为模式"\n• "生成学习建议"\n\n我将基于当前学生的数据为您提供详细分析。`
      }
    ]);
  };

  // 当选择学生时，显示NLP模块并初始化消息
  useEffect(() => {
    if (selectedStudent) {
      setShowNlpModule(true);
      initializeNlpMessages();
    } else {
      setShowNlpModule(false);
      setNlpMessages([]);
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/students');
      console.log('获取到的学生数据:', response.data);
      setStudents(response.data);
    } catch (error) {
      console.error('获取学生列表失败:', error);
      message.error('获取学生列表失败');
      setError('获取学生列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 设置API密钥
  const handleSetApiKey = async () => {
    setLoading(true);

    try {
      const response = await axios.post('/api/ai_report/set_api_key', {
        api_key: apiKey
      });

      if (response.data.status === 'success') {
        message.success('API密钥设置成功');
      } else {
        message.error(response.data.message || 'API密钥设置失败');
      }
    } catch (error) {
      console.error('设置API密钥失败:', error);
      message.error('设置API密钥时发生错误');
    } finally {
      setLoading(false);
    }
  };

  // 获取学生数据
  const fetchStudentData = async (studentId) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('开始获取学生数据:', studentId);
      
      // 获取知识掌握度分析
      const knowledgeUrl = studentId 
        ? `/api/analysis/knowledge?student_id=${studentId}` 
        : '/api/analysis/knowledge';
      console.log('请求知识点分析数据:', knowledgeUrl);
      const knowledgeResponse = await axios.get(knowledgeUrl);
      console.log('知识点分析响应:', knowledgeResponse.data);
      
      // 获取学习行为分析
      const behaviorUrl = studentId 
        ? `/api/analysis/behavior?student_id=${studentId}` 
        : '/api/analysis/behavior';
      console.log('请求学习行为分析数据:', behaviorUrl);
      const behaviorResponse = await axios.get(behaviorUrl);
      console.log('学习行为分析响应:', behaviorResponse.data);
      
      // 获取题目难度分析
      console.log('请求题目难度分析数据');
      const difficultyResponse = await axios.get('/api/analysis/difficulty');
      console.log('题目难度分析响应:', difficultyResponse.data);
      
      // 获取知识点时序数据
      let timeSeriesData = null;
      try {
        const timeSeriesUrl = studentId 
          ? `/api/analysis/knowledge/timeseries?student_id=${studentId}` 
          : '/api/analysis/knowledge/timeseries';
        console.log('请求时序数据:', timeSeriesUrl);
        const timeSeriesResponse = await axios.get(timeSeriesUrl);
        console.log('时序数据响应:', timeSeriesResponse.data);
        
        if (timeSeriesResponse.data.status === 'success') {
          timeSeriesData = timeSeriesResponse.data.timeseries_data;
        }
      } catch (timeSeriesErr) {
        console.warn('获取时序数据失败:', timeSeriesErr);
        timeSeriesData = {};
      }
      
      // 获取学生基本信息
      const studentInfo = students.find(s => s.student_ID === studentId);
      
      const combinedData = {
        studentInfo,
        knowledge: knowledgeResponse.data.status === 'success' ? {
          knowledge_mastery: knowledgeResponse.data.knowledge_mastery,
          weak_points: knowledgeResponse.data.weak_points || [],
          overall_averages: knowledgeResponse.data.overall_averages || {},
          timeseries_data: timeSeriesData
        } : null,
        behavior: behaviorResponse.data.status === 'success' ? {
          behavior_profile: behaviorResponse.data.behavior_profile,
          submission_timeline: behaviorResponse.data.submission_timeline || []
        } : null,
        difficulty: difficultyResponse.data.status === 'success' ? difficultyResponse.data : null
      };
      
      console.log('整合后的学生数据:', combinedData);
      setStudentData(combinedData);
      return combinedData;
    } catch (error) {
      console.error('获取学生数据失败:', error);
      setError('获取学生数据失败，请稍后重试');
      message.error('获取学生数据失败');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 保存图表为图片
  const saveChartAsImage = async (chartRef, chartType, chartTitle) => {
    if (!chartRef.current) {
      console.warn(`${chartType} 图表引用不存在`);
      return null;
    }

    try {
      const echartsInstance = chartRef.current.getEchartsInstance();
      const imageDataUrl = echartsInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
      });

      const response = await axios.post('/api/report/save_chart_image', {
        image_data: imageDataUrl,
        chart_type: chartType,
        chart_title: chartTitle,
        chart_index: savedCharts.length
      });

      if (response.data.status === 'success') {
        console.log(`${chartTitle} 保存成功:`, response.data.filename);
        return {
          type: chartType,
          title: chartTitle,
          filename: response.data.filename,
          path: response.data.image_path
        };
      }
    } catch (error) {
      console.error(`保存 ${chartTitle} 失败:`, error);
    }
    return null;
  };

  // 保存所有图表
  const saveAllCharts = async () => {
    if (!studentData) {
      message.error('请先获取学生数据');
      return;
    }

    setSavingCharts(true);
    const charts = [];

    try {
      // 保存知识掌握度雷达图
      if (knowledgeRadarRef.current) {
        const chart = await saveChartAsImage(knowledgeRadarRef, 'knowledge_radar', '知识点掌握度雷达图');
        if (chart) charts.push(chart);
      }

      // 保存学习行为时间分布图（24小时）
      if (behaviorHourRef.current) {
        const chart = await saveChartAsImage(behaviorHourRef, 'behavior_hour', '答题时间分布图（24小时）');
        if (chart) charts.push(chart);
      }

      // 保存学习行为时间分布图（一周）
      if (behaviorWeekRef.current) {
        const chart = await saveChartAsImage(behaviorWeekRef, 'behavior_week', '答题时间分布图（一周）');
        if (chart) charts.push(chart);
      }

      // 保存学习行为状态分布图
      if (behaviorStateRef.current) {
        const chart = await saveChartAsImage(behaviorStateRef, 'behavior_state', '答题状态分布图');
        if (chart) charts.push(chart);
      }

      // 保存学习行为方法分布图
      if (behaviorMethodRef.current) {
        const chart = await saveChartAsImage(behaviorMethodRef, 'behavior_method', '答题方法分布图');
        if (chart) charts.push(chart);
      }

      // 保存题目难度分析图
      if (difficultyRef.current) {
        const chart = await saveChartAsImage(difficultyRef, 'difficulty', '题目难度分析图');
        if (chart) charts.push(chart);
      }

      // 保存知识点时序分析图
      if (knowledgeTimeSeriesRef.current) {
        const chart = await saveChartAsImage(knowledgeTimeSeriesRef, 'knowledge_timeseries', '知识点掌握度时序分析图');
        if (chart) charts.push(chart);
      }

      setSavedCharts(charts);
      message.success(`成功保存 ${charts.length} 个图表到 backend/reports/images 目录`);
    } catch (error) {
      console.error('保存图表失败:', error);
      message.error('保存图表失败');
    } finally {
      setSavingCharts(false);
    }
  };

  // 生成传统AI报告
  const generateReport = async () => {
    if (!selectedStudent) {
      message.error('请选择学生');
      return;
    }

    setGenerating(true);

    try {
      // 先获取学生数据
      const data = await fetchStudentData(selectedStudent);
      if (!data) {
        message.error('获取学生数据失败');
        return;
      }

      // 先保存图表
      await saveAllCharts();

      // 调用AI报告生成API
      const response = await axios.post('/api/report/generate_ai', {
        api_key: apiKey,
        scope: 'single_student',
        targets: [selectedStudent],
        analysis_types: ['knowledge', 'behavior', 'difficulty'],
        analysis_data: studentData || {},
        custom_prompt: '',
        chart_images: {},
        chart_types: [],
        chart_requirements: []
      });

      if (response.data.status === 'success') {
        setGeneratedReport(response.data.report);
        setReportWithCharts(response.data.report_with_charts || response.data.report);
        message.success('报告生成成功');
      } else {
        message.error(response.data.message || '报告生成失败');
      }
    } catch (error) {
      message.error('生成报告时发生错误');
      console.error('生成报告错误:', error);
    } finally {
      setGenerating(false);
    }
  };

  // 处理NLP查询提交
  const handleNlpSubmit = async () => {
    if (!nlpQuery.trim()) return;
    if (!selectedStudent) {
      message.warning('请先选择学生');
      return;
    }

    // 添加用户消息
    const userMessage = { type: 'user', content: nlpQuery };
    setNlpMessages(prev => [...prev, userMessage]);
    
    // 清空输入框
    setNlpQuery('');
    
    // 设置加载状态
    setNlpLoading(true);
    
    try {
      let response;
      
      if (modelType === 'backend') {
        // 使用后端NLP服务，传入当前选择的学生ID
        response = await axios.post('/api/nlp/query', { 
          query: nlpQuery,
          student_id: selectedStudent,
          context: 'report_generation'
        });
        
        // 添加系统回复
        const systemMessage = { 
          type: 'system', 
          content: response.data.content || '抱歉，我无法理解您的问题。',
          data: response.data
        };
        
        setNlpMessages(prev => [...prev, systemMessage]);
      } else {
        // 使用本地Deepseek模型
        const contextPrompt = `当前分析的学生ID是: ${selectedStudent}。${studentData ? '已获取到学生数据。' : '尚未获取学生数据。'}\n\n用户问题: ${nlpQuery}`;
        const deepseekResponse = await callDeepseekModel(contextPrompt);
        
        // 添加系统回复
        const systemMessage = { 
          type: 'system', 
          content: deepseekResponse,
          model: 'deepseek'
        };
        
        setNlpMessages(prev => [...prev, systemMessage]);
      }
    } catch (error) {
      console.error('NLP查询处理失败:', error);
      message.error('查询处理失败，请稍后重试');
      
      // 添加错误消息
      const errorMessage = { 
        type: 'system', 
        content: '抱歉，处理您的请求时出现了错误。请稍后重试。',
        error: true
      };
      
      setNlpMessages(prev => [...prev, errorMessage]);
    } finally {
      setNlpLoading(false);
    }
  };

  // 调用本地Deepseek模型
  const callDeepseekModel = async (prompt) => {
    try {
      const url = "http://localhost:11434/api/generate";
      
      const data = {
        model: "deepseek-r1:8b",
        prompt: prompt,
        stream: false,
      };
      
      const response = await axios.post(url, data);
      
      if (response.status === 200) {
        return response.data.response;
      } else {
        throw new Error(`请求失败，状态码: ${response.status}`);
      }
    } catch (error) {
      console.error('Deepseek模型调用失败:', error);
      throw error;
    }
  };

  // 渲染NLP消息内容
  const renderNlpMessageContent = (message) => {
    if (message.type === 'system' && message.data && message.data.type === 'report') {
      // 渲染报告链接
      return (
        <div>
          <div style={{ 
            background: '#f6f8fa', 
            border: '1px solid #e1e4e8', 
            borderRadius: '6px', 
            padding: '16px',
            marginBottom: '12px'
          }}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          <Button type="primary" href={`/api/report/download/${message.data.report_path.split('/').pop()}`} target="_blank">
            下载报告
          </Button>
        </div>
      );
    }
    
    if (message.type === 'system') {
      // 系统消息使用Markdown渲染
      return (
        <div style={{ 
          background: message.error ? '#fff2f0' : '#f6f8fa', 
          border: `1px solid ${message.error ? '#ffccc7' : '#e1e4e8'}`, 
          borderRadius: '6px', 
          padding: '16px'
        }}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      );
    }
    
    // 用户消息保持原样
    return <Paragraph style={{lineHeight: '1.6'}}>{message.content}</Paragraph>;
  };

  // 生成多模态AI报告
  const generateMultimodalReport = async () => {
    if (!selectedStudent) {
      message.error('请选择学生');
      return;
    }

    if (!savedCharts || savedCharts.length === 0) {
      message.error('请先保存图表，然后再生成多模态报告');
      return;
    }

    setGenerating(true);

    try {
      // 先获取学生数据
      const data = await fetchStudentData(selectedStudent);
      if (!data) {
        message.error('获取学生数据失败');
        return;
      }

      // 调用多模态AI报告生成API
      const response = await axios.post('/api/report/generate_multimodal', {
        api_key: apiKey,
        student_id: selectedStudent,
        saved_charts: savedCharts,
        knowledge_data: studentData?.knowledge,
        behavior_data: studentData?.behavior,
        difficulty_data: studentData?.difficulty,
        nlp_context: nlpMessages.filter(msg => msg.type !== 'system') // 传递NLP交互上下文，过滤掉系统消息
      });

      if (response.data.status === 'success') {
        setGeneratedReport(response.data.report);
        setReportWithCharts(response.data.report_content || response.data.report);
        const hasNlpContext = nlpMessages.filter(msg => msg.type !== 'system').length > 0;
        const successMessage = hasNlpContext 
          ? '多模态报告生成成功！已整合图表分析和智能助手对话洞察的综合报告已生成。'
          : '多模态报告生成成功！基于图表深度分析的报告已生成。';
        message.success(successMessage);
      } else {
        message.error(response.data.message || '多模态报告生成失败');
      }
    } catch (error) {
      message.error('生成多模态报告时发生错误');
      console.error('生成多模态报告错误:', error);
    } finally {
      setGenerating(false);
    }
  };

  // 知识点掌握度雷达图配置
  const getKnowledgeRadarOption = () => {
    if (!studentData?.knowledge?.knowledge_mastery) return {};
    
    const knowledgeData = studentData.knowledge.knowledge_mastery;
    const overallAverages = studentData.knowledge.overall_averages || {};
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
        indicator: knowledgeNames.map(name => ({ name, max: 120 }))
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
                color: '#87CEEB',
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
                color: '#90EE90',
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

  // 渲染知识掌握度雷达图
  const renderKnowledgeRadar = () => {
    if (!studentData?.knowledge?.knowledge_mastery) {
      return <div>暂无知识掌握度数据</div>;
    }

    return <ReactECharts ref={knowledgeRadarRef} option={getKnowledgeRadarOption()} style={{ height: '400px' }} />;
  };

  // 学习行为时间分布图表配置
  const getHourDistributionOption = () => {
    if (!studentData?.behavior?.behavior_profile?.hour_distribution) return {};
    
    const hourData = studentData.behavior.behavior_profile.hour_distribution;
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const counts = Array.from({length: 24}, (_, i) => {
      const hourItem = hourData.find(item => item.hour === i);
      return hourItem ? hourItem.count : 0;
    });
    
    const getBarColor = (hour) => {
      if (hour >= 6 && hour < 12) return '#52c41a';
      if (hour >= 12 && hour < 18) return '#1890ff';
      if (hour >= 18 && hour < 22) return '#fa8c16';
      return '#722ed1';
    };
    
    const barColors = hours.map((_, index) => getBarColor(index));
    
    return {
      title: {
        text: '答题时间分布（24小时）',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          const hour = params[0].name.split(':')[0];
          const count = params[0].value;
          let period = '';
          if (hour >= 6 && hour < 12) period = '上午';
          else if (hour >= 12 && hour < 18) period = '下午';
          else if (hour >= 18 && hour < 22) period = '晚上';
          else period = '深夜/凌晨';
          return `${params[0].name}<br/>提交次数: ${count}<br/>时段: ${period}`;
        }
      },
      legend: {
        data: ['上午(6-12点)', '下午(12-18点)', '晚上(18-22点)', '深夜/凌晨(22-6点)'],
        bottom: 0,
        icon: 'rect',
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { fontSize: 12 }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: hours,
        name: '时间',
        nameLocation: 'middle',
        nameGap: 30,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        name: '提交次数',
        nameLocation: 'middle',
        nameGap: 40
      },
      series: [
        {
          name: '提交次数',
          type: 'bar',
          data: counts,
          itemStyle: {
            color: function(params) {
              return barColors[params.dataIndex];
            }
          }
        }
      ]
    };
  };

  // 学习行为状态分布图表配置
  const getStateDistributionOption = () => {
    if (!studentData?.behavior?.behavior_profile?.state_distribution) return {};
    
    const stateData = Object.entries(studentData.behavior.behavior_profile.state_distribution)
      .filter(([key, value]) => !key.match(/[^\x00-\x7F]/)) // 过滤非ASCII字符
      .map(([key, value]) => ({
        name: key,
        value: value
      }));
    
    return {
      title: {
        text: '答题状态分布',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 14
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        bottom: 10,
        left: 'center',
        data: stateData.map(item => item.name)
      },
      series: [
        {
          name: '答题状态',
          type: 'pie',
          radius: ['30%', '55%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4
          },
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: stateData
        }
      ]
    };
  };

  // 计算一周分布数据
  const calculateWeekDistribution = (submissions) => {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekCounts = Array(7).fill(0);
    
    submissions.forEach((submission) => {
      let beijingDate;
      
      // 处理后端返回的真实数据（time字段，Unix时间戳）
      if (submission.time) {
        // 将Unix时间戳转换为毫秒，然后创建Date对象
        // 由于时间戳是UTC时间，需要转换为北京时间（UTC+8）
        const timestamp = parseFloat(submission.time) * 1000; // 转换为毫秒
        const utcDate = new Date(timestamp);
        
        // 转换为北京时间（UTC+8）
        const beijingOffset = 8 * 60 * 60 * 1000; // 8小时的毫秒数
        beijingDate = new Date(utcDate.getTime() + beijingOffset);
      }
      // 处理模拟数据（submit_time字段，字符串格式）
      else if (submission.submit_time) {
        // submit_time格式: "2024-01-15 14:30:00"
        beijingDate = new Date(submission.submit_time);
      }
      
      if (beijingDate && !isNaN(beijingDate.getTime())) {
        const dayOfWeek = beijingDate.getDay(); // 0 = 周日, 1 = 周一, ..., 6 = 周六
        weekCounts[dayOfWeek]++;
      }
    });
    
    return weekDays.map((day, index) => ({
      day: day,
      count: weekCounts[index]
    }));
  };

  // 一周答题时间分布图表配置
  const getWeekDistributionOption = () => {
    // 检查多个可能的数据源
    let submissions = null;
    
    if (studentData?.behavior?.submissions && studentData.behavior.submissions.length > 0) {
      submissions = studentData.behavior.submissions;
    } else if (studentData?.submissions && studentData.submissions.length > 0) {
      submissions = studentData.submissions;
    } else {
      // 使用固定的模拟数据用于展示，避免每次渲染都变化
      const mockSubmissions = [
        { submit_time: '2024-01-15 09:30:00' }, // 周一
        { submit_time: '2024-01-15 14:20:00' }, // 周一
        { submit_time: '2024-01-16 10:15:00' }, // 周二
        { submit_time: '2024-01-16 16:45:00' }, // 周二
        { submit_time: '2024-01-16 20:30:00' }, // 周二
        { submit_time: '2024-01-17 11:20:00' }, // 周三
        { submit_time: '2024-01-17 15:10:00' }, // 周三
        { submit_time: '2024-01-18 08:45:00' }, // 周四
        { submit_time: '2024-01-18 13:30:00' }, // 周四
        { submit_time: '2024-01-18 19:15:00' }, // 周四
        { submit_time: '2024-01-19 09:00:00' }, // 周五
        { submit_time: '2024-01-19 17:30:00' }, // 周五
        { submit_time: '2024-01-20 10:45:00' }, // 周六
        { submit_time: '2024-01-20 14:20:00' }, // 周六
        { submit_time: '2024-01-20 18:00:00' }, // 周六
        { submit_time: '2024-01-21 11:30:00' }, // 周日
        { submit_time: '2024-01-21 15:45:00' }, // 周日
        { submit_time: '2024-01-22 08:20:00' }, // 周一
        { submit_time: '2024-01-22 12:10:00' }, // 周一
        { submit_time: '2024-01-22 16:50:00' }  // 周一
      ];
      submissions = mockSubmissions;
    }
    
    const weekData = calculateWeekDistribution(submissions);
    const days = weekData.map(item => item.day);
    const counts = weekData.map(item => item.count);
    
    // 根据星期设置颜色
    const getBarColor = (dayIndex) => {
      if (dayIndex === 0 || dayIndex === 6) return '#fa8c16'; // 周末 - 橙色
      return '#1890ff'; // 工作日 - 蓝色
    };
    
    const barColors = days.map((_, index) => getBarColor(index));
    
    return {
      title: {
        text: '答题时间分布（一周）',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          const day = params[0].name;
          const count = params[0].value;
          const isWeekend = day === '周日' || day === '周六';
          const dayType = isWeekend ? '周末' : '工作日';
          return `${day}<br/>提交次数: ${count}<br/>类型: ${dayType}`;
        }
      },
      legend: {
        data: ['工作日', '周末'],
        bottom: 0,
        icon: 'rect',
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { fontSize: 12 }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: days,
        name: '星期',
        nameLocation: 'middle',
        nameGap: 30
      },
      yAxis: {
        type: 'value',
        name: '提交次数',
        nameLocation: 'middle',
        nameGap: 40
      },
      series: [
        {
          name: '提交次数',
          type: 'bar',
          data: counts,
          itemStyle: {
            color: function(params) {
              return barColors[params.dataIndex];
            }
          }
        }
      ]
    };
  };

  // 答题方法分布图表配置
  const getMethodDistributionOption = () => {
    if (!studentData?.behavior?.behavior_profile?.method_distribution) return {};
    
    const methodData = Object.entries(studentData.behavior.behavior_profile.method_distribution).map(([key, value]) => ({
      name: key,
      value: value
    }));
    
    return {
      title: {
        text: '解题方法分布',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 14
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        bottom: 10,
        left: 'center',
        data: methodData.map(item => item.name)
      },
      series: [
        {
          name: '解题方法',
          type: 'pie',
          radius: ['30%', '55%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4
          },
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: methodData
        }
      ]
    };
  };

  // 渲染学习行为图表
  const renderBehaviorChart = () => {
    if (!studentData?.behavior?.behavior_profile) {
      return <div>暂无学习行为数据</div>;
    }

    return (
      <div>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card 
              title="时间分布" 
              extra={
                <Radio.Group 
                  value={timeDistributionMode} 
                  onChange={(e) => setTimeDistributionMode(e.target.value)}
                  size="small"
                >
                  <Radio.Button value="hour">24小时</Radio.Button>
                  <Radio.Button value="week">一周</Radio.Button>
                </Radio.Group>
              }
            >
              {timeDistributionMode === 'hour' ? (
                <ReactECharts ref={behaviorHourRef} option={getHourDistributionOption()} style={{ height: '300px' }} />
              ) : (
                <ReactECharts ref={behaviorWeekRef} option={getWeekDistributionOption()} style={{ height: '300px' }} />
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              title="分布分析" 
              extra={
                <Radio.Group 
                  value={stateMethodMode} 
                  onChange={(e) => setStateMethodMode(e.target.value)}
                  size="small"
                >
                  <Radio.Button value="state">状态分布</Radio.Button>
                  <Radio.Button value="method">方法分布</Radio.Button>
                </Radio.Group>
              }
            >
              {stateMethodMode === 'state' ? (
                <ReactECharts ref={behaviorStateRef} option={getStateDistributionOption()} style={{ height: '300px' }} />
              ) : (
                <ReactECharts ref={behaviorMethodRef} option={getMethodDistributionOption()} style={{ height: '300px' }} />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // 题目难度分析图表配置
  const getDifficultyOption = () => {
    if (!studentData?.difficulty?.difficulty_analysis) return {};
    
    const difficultyData = studentData.difficulty.difficulty_analysis;
    const levels = Object.keys(difficultyData).sort();
    const counts = levels.map(level => difficultyData[level].count || 0);
    const accuracies = levels.map(level => (difficultyData[level].accuracy || 0) * 100);
    
    return {
      title: {
        text: '题目难度分析',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['题目数量', '正确率(%)'],
        bottom: 0
      },
      xAxis: {
        type: 'category',
        data: levels,
        name: '难度等级'
      },
      yAxis: [
        {
          type: 'value',
          name: '题目数量',
          position: 'left'
        },
        {
          type: 'value',
          name: '正确率(%)',
          position: 'right',
          max: 100
        }
      ],
      series: [
        {
          name: '题目数量',
          type: 'bar',
          data: counts,
          itemStyle: {
            color: '#1890ff'
          }
        },
        {
          name: '正确率(%)',
          type: 'line',
          yAxisIndex: 1,
          data: accuracies,
          lineStyle: {
            color: '#52c41a'
          },
          itemStyle: {
            color: '#52c41a'
          }
        }
      ]
    };
  };

  // 知识点时序分析图表配置
  const getKnowledgeTimeSeriesOption = () => {
    if (!studentData?.knowledge?.timeseries_data || Object.keys(studentData.knowledge.timeseries_data).length === 0) {
      // 如果没有时序数据，显示静态的掌握度对比
      if (!studentData?.knowledge?.knowledge_mastery) return {};
      
      const knowledgeData = studentData.knowledge.knowledge_mastery;
      const knowledgeNames = Object.keys(knowledgeData);
      const masteryLevels = knowledgeNames.map(name => (knowledgeData[name].mastery_level * 100).toFixed(2));
      
      return {
        title: {
          text: '知识点掌握度对比',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: knowledgeNames,
          name: '知识点'
        },
        yAxis: {
          type: 'value',
          name: '掌握度(%)',
          max: 100
        },
        series: [
          {
            name: '掌握度',
            type: 'bar',
            data: masteryLevels,
            itemStyle: {
              color: '#1890ff'
            }
          }
        ]
      };
    }
    
    // 如果有时序数据，显示时序图
    const timeSeriesData = studentData.knowledge.timeseries_data;
    const knowledgePoints = Object.keys(timeSeriesData);
    const dates = [];
    
    // 收集所有日期
    knowledgePoints.forEach(kp => {
      if (timeSeriesData[kp] && timeSeriesData[kp].length > 0) {
        timeSeriesData[kp].forEach(item => {
          if (item.date && !dates.includes(item.date)) {
            dates.push(item.date);
          }
        });
      }
    });
    
    dates.sort();
    
    const series = knowledgePoints.map((kp, index) => {
      const data = dates.map(date => {
        const item = timeSeriesData[kp]?.find(d => d.date === date);
        return item ? (item.mastery_level * 100).toFixed(2) : null;
      });
      
      const colors = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2'];
      
      return {
        name: kp,
        type: 'line',
        data: data,
        lineStyle: {
          color: colors[index % colors.length]
        },
        itemStyle: {
          color: colors[index % colors.length]
        },
        connectNulls: false
      };
    });
    
    return {
      title: {
        text: '知识点掌握度时序分析',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: knowledgePoints,
        bottom: 0
      },
      xAxis: {
        type: 'category',
        data: dates,
        name: '日期'
      },
      yAxis: {
        type: 'value',
        name: '掌握度(%)',
        max: 100
      },
      series: series
    };
  };

  // 渲染难度分析图表
  const renderDifficultyChart = () => {
    if (!studentData?.difficulty?.difficulty_analysis) {
      return <div>暂无难度分析数据</div>;
    }

    return <ReactECharts ref={difficultyRef} option={getDifficultyOption()} style={{ height: '400px' }} />;
  };

  // 渲染知识点时序分析图表
  const renderKnowledgeTimeSeriesChart = () => {
    return <ReactECharts ref={knowledgeTimeSeriesRef} option={getKnowledgeTimeSeriesOption()} style={{ height: '400px' }} />;
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
         <BulbOutlined style={{ fontSize: '32px', color: '#1890ff', marginRight: '12px' }} />
         <Title level={1} style={{ margin: 0 }}>AI报告生成器</Title>
       </div>

      {/* API密钥设置 */}
      <Card 
        title={
          <Space>
            <UserOutlined />
            <span>API密钥设置</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={16} align="bottom">
          <Col flex={1}>
            <div style={{ marginBottom: '8px' }}>智谱AI API密钥（可选）</div>
            <Input.Password
              placeholder="请输入智谱AI API密钥（留空则自动使用环境变量ZHIPUAI_API_KEY）"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </Col>
          <Col>
            <Button 
              type="primary" 
              onClick={handleSetApiKey} 
              loading={loading}
              icon={loading ? <LoadingOutlined /> : null}
            >
              {apiKey.trim() ? '设置密钥' : '使用环境变量'}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 学生选择 */}
      <Card 
        title={
          <Space>
            <UserOutlined />
            <span>学生选择</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={16} align="bottom">
          <Col flex={1}>
            <div style={{ marginBottom: '8px' }}>学生</div>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择学生"
              value={selectedStudent}
              onChange={setSelectedStudent}
            >
              {students.map((student) => (
                <Option key={student.student_ID} value={student.student_ID}>
                  学生 {student.student_ID} (年龄: {student.age}, 性别: {student.sex})
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button 
              onClick={() => selectedStudent && fetchStudentData(selectedStudent)} 
              disabled={!selectedStudent || loading}
              loading={loading}
              icon={<EyeOutlined />}
            >
              预览数据
            </Button>
          </Col>
        </Row>
      </Card>

      {/* NLP智能交互模块 */}
      {showNlpModule && (
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <MessageOutlined />
                <span>智能分析助手</span>
                <Tag color="blue">学生ID: {selectedStudent}</Tag>
              </Space>
              <Select 
                value={modelType} 
                onChange={setModelType} 
                style={{ width: 200 }}
                size="small"
              >
                <Option value="backend">后端NLP服务</Option>
                <Option value="deepseek">本地Deepseek模型</Option>
              </Select>
            </div>
          }
          style={{ marginBottom: '24px' }}
        >
          <div style={{ marginBottom: '16px' }}>
            <Alert
              message="智能分析助手已激活"
              description="您可以向AI助手询问关于当前学生的学习情况，获取个性化的分析建议。您的对话内容将作为上下文信息，帮助生成更精准的多模态AI报告。建议询问学习模式、问题诊断或改进建议等相关问题。"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          </div>
          
          {/* 消息列表 */}
          <Card
            style={{ 
              height: '400px', 
              marginBottom: '16px', 
              display: 'flex', 
              flexDirection: 'column' 
            }}
            bodyStyle={{ 
              flex: 1, 
              overflow: 'auto', 
              padding: '12px 24px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <List
              itemLayout="horizontal"
              dataSource={nlpMessages}
              style={{ flex: 1 }}
              renderItem={(message) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={
                      message.type === 'user' ? 
                      <UserOutlined style={{ fontSize: '24px', color: '#1890ff' }} /> : 
                      <RobotOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                    }
                    title={message.type === 'user' ? '您' : 'AI助手'}
                    description={renderNlpMessageContent(message)}
                  />
                </List.Item>
              )}
            />
            <div ref={messagesEndRef} />
            
            {nlpLoading && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin tip="AI助手正在分析..." />
              </div>
            )}
          </Card>
          
          {/* 输入框 */}
          <div style={{ display: 'flex' }}>
            <TextArea
              value={nlpQuery}
              onChange={(e) => setNlpQuery(e.target.value)}
              placeholder={`向AI助手询问学生${selectedStudent}的学习情况...`}
              autoSize={{ minRows: 2, maxRows: 4 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleNlpSubmit();
                }
              }}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              onClick={handleNlpSubmit}
              loading={nlpLoading}
              style={{ height: 'auto' }}
            >
              发送
            </Button>
          </div>
        </Card>
      )}

      {studentData && (
        <Card 
          title={
            <Space>
              <BarChartOutlined />
              <span>学生数据分析</span>
            </Space>
          }
          extra={
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={saveAllCharts}
              loading={savingCharts}
              disabled={!studentData}
            >
              保存所有图表
            </Button>
          }
          style={{ marginBottom: '24px' }}
        >
          {error && (
            <Alert 
              message="错误" 
              description={error} 
              type="error" 
              showIcon 
              style={{ marginBottom: 16 }}
            />
          )}
          
          {savedCharts.length > 0 && (
            <Alert 
              message="图表保存成功" 
              description={`已保存 ${savedCharts.length} 个图表到 backend/reports/images 目录`}
              type="success" 
              showIcon 
              style={{ marginBottom: 16 }}
              action={
                <Button size="small" icon={<PictureOutlined />}>
                  查看保存的图表
                </Button>
              }
            />
          )}
          
          <Tabs defaultActiveKey="knowledge">
            <TabPane tab="知识掌握度" key="knowledge">
              <Row gutter={16}>
                <Col span={12}>
                  <Title level={4}>知识点掌握度雷达图</Title>
                  {renderKnowledgeRadar()}
                </Col>
                <Col span={12}>
                  <Title level={4}>掌握度统计</Title>
                  <div style={{ padding: '16px' }}>
                    {studentData.knowledge?.knowledge_mastery && 
                      Object.entries(studentData.knowledge.knowledge_mastery).map(([knowledge, data]) => (
                        <div key={knowledge} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span>{knowledge}</span>
                          <span style={{ fontWeight: 'bold' }}>{((data.mastery_level || data.correct_rate || 0) * 100).toFixed(1)}%</span>
                        </div>
                      ))
                    }
                  </div>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane tab="学习行为" key="behavior">
              <Row gutter={16}>
                <Col span={12}>
                  <Title level={4}>学习行为统计</Title>
                  {renderBehaviorChart()}
                </Col>
                <Col span={12}>
                  <Title level={4}>行为数据</Title>
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>总提交次数</span>
                      <span style={{ fontWeight: 'bold' }}>{studentData.behavior?.behavior_profile?.total_submissions || 0} 次</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>平均用时</span>
                      <span style={{ fontWeight: 'bold' }}>{(studentData.behavior?.behavior_profile?.avg_time_consume || 0).toFixed(1)} ms</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>掌握程度</span>
                      <span style={{ fontWeight: 'bold' }}>{((studentData.behavior?.behavior_profile?.correct_rate || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane tab="难度分析" key="difficulty">
              <Row gutter={16}>
                <Col span={12}>
                  <Title level={4}>题目难度分析</Title>
                  {renderDifficultyChart()}
                </Col>
                <Col span={12}>
                  <Title level={4}>知识点掌握度时序分析</Title>
                  {renderKnowledgeTimeSeriesChart()}
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </Card>
      )}

      {/* 报告生成 */}
      <Card 
        title={
           <Space>
             <ThunderboltOutlined />
             <span>生成AI报告</span>
           </Space>
         }
        style={{ marginBottom: '24px' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Button 
            type="primary"
            size="large"
            onClick={generateReport} 
            disabled={!selectedStudent || generating}
            loading={generating}
            style={{ width: '100%' }}
            icon={generating ? <LoadingOutlined /> : <BulbOutlined />}
          >
            生成传统AI报告
          </Button>
          
          <Button 
            type="primary"
            size="large"
            onClick={generateMultimodalReport} 
            disabled={!selectedStudent || generating || !savedCharts || savedCharts.length === 0}
            loading={generating}
            style={{ 
              width: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}
            icon={generating ? <LoadingOutlined /> : <BulbOutlined />}
          >
            生成多模态AI报告 {savedCharts && savedCharts.length > 0 ? `(已保存${savedCharts.length}个图表)` : '(需先保存图表)'}
          </Button>
          
          {savedCharts && savedCharts.length > 0 && (
            <div style={{ 
              fontSize: '12px', 
              color: '#52c41a', 
              textAlign: 'center',
              padding: '4px 8px',
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '4px'
            }}>
              ✓ 多模态分析将基于已保存的图表进行深度分析
            </div>
          )}
        </Space>
      </Card>

      {/* 生成的报告 */}
      {generatedReport && (
        <Card 
          title={
            <Space>
              <span>生成的AI报告</span>
              {generatedReport.includes('多模态') || generatedReport.includes('图表分析') ? (
                <span style={{ 
                  fontSize: '12px', 
                  color: '#722ed1', 
                  background: '#f9f0ff', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  border: '1px solid #d3adf7'
                }}>
                  多模态分析
                </span>
              ) : (
                <span style={{ 
                  fontSize: '12px', 
                  color: '#1890ff', 
                  background: '#e6f7ff', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  border: '1px solid #91d5ff'
                }}>
                  传统分析
                </span>
              )}
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          <Tabs defaultActiveKey="formatted">
            <TabPane tab="格式化报告" key="formatted">
              <div style={{ 
                backgroundColor: '#fafafa', 
                padding: '20px', 
                borderRadius: '8px',
                border: '1px solid #f0f0f0',
                lineHeight: '1.8'
              }}>
                <div 
                  style={{
                    fontSize: '14px',
                    color: '#262626',
                    whiteSpace: 'pre-wrap'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: reportWithCharts.replace(/\n/g, '<br/>').replace(/##\s*(.*?)(<br\/>|$)/g, '<h3 style="color: #1890ff; margin: 20px 0 10px 0; font-size: 16px;">$1</h3>').replace(/\*\*(.*?)\*\*/g, '<strong style="color: #262626;">$1</strong>') 
                  }}
                />
              </div>
            </TabPane>
            
            <TabPane tab="原始报告" key="original">
              <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '6px' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>{generatedReport}</pre>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      )}


    </div>
  );
};

export default ReportGenerator;