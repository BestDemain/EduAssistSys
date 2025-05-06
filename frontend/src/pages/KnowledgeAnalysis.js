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
      
      const response = await axios.get(url);
      
      if (response.data.status === 'success') {
        setKnowledgeData(response.data.knowledge_mastery);
        setWeakPoints(response.data.weak_points || []);
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
    const correctRates = knowledgeNames.map(name => (knowledgeData[name].correct_rate * 100).toFixed(2));
    
    return {
      title: {
        text: '知识点掌握度雷达图',
        left: 'center'
      },
      tooltip: {
        trigger: 'item'
      },
      radar: {
        indicator: knowledgeNames.map(name => ({ name, max: 100 }))
      },
      series: [
        {
          name: '知识点掌握度',
          type: 'radar',
          data: [
            {
              value: correctRates,
              name: '正确率(%)',
              areaStyle: {
                color: 'rgba(24, 144, 255, 0.3)'
              },
              lineStyle: {
                color: '#1890ff'
              },
              itemStyle: {
                color: '#1890ff'
              }
            }
          ]
        }
      ]
    };
  };
  
  // 生成知识点掌握度柱状图配置
  const getKnowledgeBarOption = () => {
    if (!knowledgeData) return {};
    
    const knowledgeNames = Object.keys(knowledgeData);
    const correctRates = knowledgeNames.map(name => (knowledgeData[name].correct_rate * 100).toFixed(2));
    const submissionRates = knowledgeNames.map(name => (knowledgeData[name].correct_submission_rate * 100).toFixed(2));
    
    return {
      title: {
        text: '知识点掌握度对比',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['正确率(%)', '正确提交率(%)'],
        top: 'bottom'
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
        name: '百分比(%)',
        max: 100
      },
      series: [
        {
          name: '正确率(%)',
          type: 'bar',
          data: correctRates,
          itemStyle: {
            color: '#1890ff'
          }
        },
        {
          name: '正确提交率(%)',
          type: 'bar',
          data: submissionRates,
          itemStyle: {
            color: '#52c41a'
          }
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
              <Card className="chart-card" title="知识点掌握度对比">
                <ReactECharts
                  option={getKnowledgeBarOption()}
                  style={{ height: '300px', width: '100%' }}
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