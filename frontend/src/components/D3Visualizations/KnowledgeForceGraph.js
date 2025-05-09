import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Card, Typography } from 'antd';

const { Title } = Typography;

/**
 * 知识点力导向图组件
 * 使用D3.js实现的力导向图，展示知识点之间的关联关系
 * @param {Object} props
 * @param {Object} props.data 知识点数据
 */
const KnowledgeForceGraph = ({ data, title = '知识点关联力导向图' }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    // 添加调试信息
    console.log('KnowledgeForceGraph组件接收到数据:', data);
    
    if (!data || !data.nodes) {
      console.log('KnowledgeForceGraph组件：数据不完整或为空，无法渲染图表');
      return;
    }
    
    // 确保links数组存在
    const links = data.links || [];
    // 创建数据的深拷贝，避免修改原始数据
    const graphData = {
      nodes: [...data.nodes],
      links: [...links]
    };
    
    console.log('KnowledgeForceGraph组件：处理后的数据:', graphData);

    // 清除之前的图表
    d3.select(svgRef.current).selectAll('*').remove();

    // 设置画布尺寸
    const width = 600;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // 创建SVG元素
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建力导向模拟
    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2 - margin.left, height / 2 - margin.top))
      .force('collision', d3.forceCollide().radius(30));

    // 定义颜色比例尺 - 根据掌握程度设置颜色
    const colorScale = d3.scaleLinear()
      .domain([0, 0.5, 1])
      .range(['#ff4d4f', '#faad14', '#52c41a']);

    // 绘制连接线
    const link = svg.append('g')
      .selectAll('line')
      .data(graphData.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value || 1));

    // 创建节点组
    const node = svg.append('g')
      .selectAll('.node')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // 添加节点圆圈
    node.append('circle')
      .attr('r', d => {
        // 确保value存在且为数字，否则使用默认值
        const value = typeof d.value === 'number' && !isNaN(d.value) ? d.value : 1;
        return 20 + value * 10;
      })
      .attr('fill', d => {
        // 确保mastery存在且为数字，否则使用默认值0.5
        const mastery = typeof d.mastery === 'number' && !isNaN(d.mastery) ? d.mastery : 0.5;
        return colorScale(mastery);
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    // 添加节点文本
    node.append('text')
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(d => d.name)
      .attr('fill', '#fff')
      .style('font-size', '12px')
      .style('pointer-events', 'none');

    // 添加标题
    svg.append('text')
      .attr('x', (width - margin.left - margin.right) / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(title);

    // 添加图例
    const legend = svg.append('g')
      .attr('transform', `translate(${width - margin.right - 150}, ${height - margin.bottom - 80})`);

    const legendData = [
      { color: '#ff4d4f', text: '掌握度低' },
      { color: '#faad14', text: '掌握度中' },
      { color: '#52c41a', text: '掌握度高' }
    ];

    legendData.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendRow.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', item.color);
      
      legendRow.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .text(item.text)
        .style('font-size', '12px');
    });

    // 更新力导向图
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // 拖拽事件处理函数
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // 添加交互提示
    node.append('title')
      .text(d => `${d.name}\n掌握度: ${(d.mastery * 100).toFixed(1)}%`);

    return () => {
      simulation.stop();
    };
  }, [data, title]);

  return (
    <Card style={{ marginTop: 16 }}>
      <Title level={4}>{title}</Title>
      <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
        <svg ref={svgRef} width="600" height="400"></svg>
      </div>
    </Card>
  );
};

export default KnowledgeForceGraph;