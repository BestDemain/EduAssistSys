import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Card, Typography } from 'antd';

const { Title } = Typography;

/**
 * 答题提交时间线可视化组件
 * 使用D3.js实现的时间序列图，展示学习者答题行为的时间模式
 * @param {Object} props
 * @param {Array} props.data 答题数据数组
 * @param {string} props.title 图表标题
 */
const SubmissionTimeline = ({ data, title = '答题行为时间线' }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // 清除之前的图表
    d3.select(svgRef.current).selectAll('*').remove();

    // 设置画布尺寸
    const width = 800;
    const height = 300;
    const margin = { top: 30, right: 50, bottom: 50, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 解析日期
    const parseDate = d3.timeParse('%Y-%m-%d %H:%M:%S');
    
    // 处理数据
    const processedData = data.map(d => ({
      ...d,
      timestamp: parseDate(d.submit_time),
      correct: d.is_correct ? '正确' : '错误'
    })).sort((a, b) => a.timestamp - b.timestamp);

    // 创建SVG元素
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建X轴比例尺（时间）
    const xScale = d3.scaleTime()
      .domain(d3.extent(processedData, d => d.timestamp))
      .range([0, innerWidth]);

    // 创建Y轴比例尺（知识点分类）
    const knowledgePoints = [...new Set(processedData.map(d => d.knowledge))];
    const yScale = d3.scaleBand()
      .domain(knowledgePoints)
      .range([0, innerHeight])
      .padding(0.2);

    // 创建颜色比例尺（根据是否正确）
    const colorScale = d3.scaleOrdinal()
      .domain(['正确', '错误'])
      .range(['#52c41a', '#ff4d4f']);

    // 绘制X轴
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    // 添加X轴标签
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 5)
      .style('text-anchor', 'middle')
      .text('提交时间');

    // 绘制Y轴
    svg.append('g')
      .call(d3.axisLeft(yScale));

    // 添加Y轴标签
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('知识点');

    // 绘制数据点
    svg.selectAll('.dot')
      .data(processedData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.timestamp))
      .attr('cy', d => yScale(d.knowledge) + yScale.bandwidth() / 2)
      .attr('r', 6)
      .style('fill', d => colorScale(d.correct))
      .style('opacity', 0.7)
      .style('stroke', '#fff')
      .style('stroke-width', 1)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 9)
          .style('opacity', 1);

        // 显示提示框
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        tooltip.html(`题目ID: ${d.title_id}<br/>知识点: ${d.knowledge}<br/>结果: ${d.correct}<br/>时间: ${d3.timeFormat('%Y-%m-%d %H:%M')(d.timestamp)}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(500)
          .attr('r', 6)
          .style('opacity', 0.7);

        // 隐藏提示框
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    // 添加标题
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(title);

    // 添加图例
    const legend = svg.append('g')
      .attr('transform', `translate(${innerWidth - 100}, -10)`);

    const legendData = [
      { color: '#52c41a', text: '正确' },
      { color: '#ff4d4f', text: '错误' }
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

    // 创建提示框
    const tooltip = d3.select('body').append('div')
      .attr('class', 'd3-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('text-align', 'center')
      .style('padding', '8px')
      .style('font-size', '12px')
      .style('background', 'rgba(0, 0, 0, 0.75)')
      .style('color', '#fff')
      .style('border-radius', '4px')
      .style('pointer-events', 'none');

    // 清理函数
    return () => {
      d3.select('body').selectAll('.d3-tooltip').remove();
    };
  }, [data, title]);

  return (
    <Card style={{ marginTop: 16 }}>
      <Title level={4}>{title}</Title>
      <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
        <svg ref={svgRef}></svg>
      </div>
    </Card>
  );
};

export default SubmissionTimeline;