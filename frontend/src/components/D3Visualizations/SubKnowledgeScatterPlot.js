import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Card, Typography } from 'antd';

const { Title } = Typography;

/**
 * 子知识点掌握程度与正确率关系图组件
 * 使用D3.js实现的散点图，展示子知识点掌握程度与正确率的关系
 * @param {Object} props
 * @param {Array} props.data 子知识点数据数组
 * @param {string} props.title 图表标题
 */
const SubKnowledgeScatterPlot = ({ data, title = '子知识点掌握程度与正确率关系图' }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // 清除之前的图表
    d3.select(svgRef.current).selectAll('*').remove();

    // 设置画布尺寸
    const width = 700;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 创建SVG元素
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建X轴比例尺（掌握程度）
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, innerWidth]);

    // 创建Y轴比例尺（正确率）
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0]);

    // 创建大小比例尺
    const sizeScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.question_count), d3.max(data, d => d.question_count)])
      .range([5, 15]);

    // 绘制X轴
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `${(d * 100).toFixed(0)}%`))
      .selectAll('text')
      .style('text-anchor', 'middle');

    // 添加X轴标签
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 10)
      .style('text-anchor', 'middle')
      .text('平均掌握程度');

    // 绘制Y轴
    svg.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => `${(d * 100).toFixed(0)}%`));

    // 添加Y轴标签
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('正确率');

    // 添加网格线
    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickSize(-innerHeight)
          .tickFormat('')
      )
      .selectAll('line')
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.7);

    svg.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat('')
      )
      .selectAll('line')
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.7);

    // 创建tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    // 绘制散点
    svg.selectAll('.dot')
      .data(data)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.avg_mastery))
      .attr('cy', d => yScale(d.correct_rate))
      .attr('r', d => sizeScale(d.question_count))
      .style('fill', d => {
        const diff = d.avg_mastery - d.correct_rate;
        if (diff > 0.15) return '#ff4d4f'; // 掌握度高但正确率低
        if (diff > 0.1) return '#faad14'; // 掌握度略高于正确率
        if (diff < -0.1) return '#722ed1'; // 正确率高但掌握度低
        return '#52c41a'; // 掌握度与正确率匹配
      })
      .style('opacity', 0.7)
      .style('stroke', '#fff')
      .style('stroke-width', 1)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('opacity', 1)
          .style('stroke-width', 2);
        
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        
        tooltip.html(`
          <strong>子知识点:</strong> ${d.sub_knowledge}<br/>
          <strong>平均掌握程度:</strong> ${(d.avg_mastery * 100).toFixed(1)}%<br/>
          <strong>正确率:</strong> ${(d.correct_rate * 100).toFixed(1)}%<br/>
          <strong>题目数量:</strong> ${d.question_count}
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function(d) {
        d3.select(this)
          .style('opacity', 0.7)
          .style('stroke-width', 1);
        
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    // 添加图例
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth - 200}, 20)`);

    const legendData = [
      { color: '#ff4d4f', label: '掌握度高但正确率低' },
      { color: '#faad14', label: '掌握度略高于正确率' },
      { color: '#722ed1', label: '正确率高但掌握度低' },
      { color: '#52c41a', label: '掌握度与正确率匹配' }
    ];

    legend.selectAll('.legend-item')
      .data(legendData)
      .enter().append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`)
      .each(function(d) {
        const g = d3.select(this);
        g.append('circle')
          .attr('cx', 8)
          .attr('cy', 0)
          .attr('r', 6)
          .style('fill', d.color);
        g.append('text')
          .attr('x', 20)
          .attr('y', 0)
          .attr('dy', '0.35em')
          .style('font-size', '12px')
          .text(d.label);
      });

    // 添加大小图例
    const sizeLegend = svg.append('g')
      .attr('class', 'size-legend')
      .attr('transform', `translate(20, 20)`);

    sizeLegend.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('题目数量');

    const sizeLegendData = [
      { size: 5, label: '少' },
      { size: 10, label: '中' },
      { size: 15, label: '多' }
    ];

    sizeLegend.selectAll('.size-legend-item')
      .data(sizeLegendData)
      .enter().append('g')
      .attr('class', 'size-legend-item')
      .attr('transform', (d, i) => `translate(${i * 40}, 10)`)
      .each(function(d) {
        const g = d3.select(this);
        g.append('circle')
          .attr('cx', 15)
          .attr('cy', 0)
          .attr('r', d.size)
          .style('fill', '#1890ff')
          .style('opacity', 0.7);
        g.append('text')
          .attr('x', 15)
          .attr('y', 25)
          .style('text-anchor', 'middle')
          .style('font-size', '10px')
          .text(d.label);
      });

    // 清理函数
    return () => {
      d3.select('body').selectAll('.tooltip').remove();
    };
  }, [data]);

  return (
    <div style={{ width: '100%', textAlign: 'center' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default SubKnowledgeScatterPlot;