import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Card, Typography } from 'antd';

const { Title } = Typography;

/**
 * 知识点和子知识点掌握程度与正确率关系图组件
 * 使用D3.js实现的散点图，在同一张图上展示知识点和子知识点的掌握程度与正确率关系
 * @param {Object} props
 * @param {Array} props.knowledgeData 知识点数据数组
 * @param {Array} props.subKnowledgeData 子知识点数据数组
 * @param {string} props.title 图表标题
 */
const CombinedKnowledgeScatterPlot = ({ knowledgeData = [], subKnowledgeData = [], title = '知识点掌握程度与正确率关系图' }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if ((!knowledgeData || knowledgeData.length === 0) && (!subKnowledgeData || subKnowledgeData.length === 0)) return;

    // 清除之前的图表
    d3.select(svgRef.current).selectAll('*').remove();

    // 设置画布尺寸
    const width = 800;
    const height = 500;
    const margin = { top: 40, right: 40, bottom: 80, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 创建SVG元素
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // 创建主绘图区域
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建缩放行为
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5]) // 缩放范围：0.5倍到5倍
      .on('zoom', (event) => {
        const { transform } = event;
        
        // 更新比例尺
        const newXScale = transform.rescaleX(xScale);
        const newYScale = transform.rescaleY(yScale);
        
        // 更新坐标轴
        g.select('.x-axis')
          .call(d3.axisBottom(newXScale).tickFormat(d => `${(d * 100).toFixed(0)}%`));
        g.select('.y-axis')
          .call(d3.axisLeft(newYScale).tickFormat(d => `${(d * 100).toFixed(0)}%`));
        
        // 更新网格线
        g.select('.x-grid')
          .call(
            d3.axisBottom(newXScale)
              .tickSize(-innerHeight)
              .tickFormat('')
          )
          .selectAll('line')
          .style('stroke', '#e0e0e0')
          .style('stroke-opacity', 0.7);
        
        g.select('.y-grid')
          .call(
            d3.axisLeft(newYScale)
              .tickSize(-innerWidth)
              .tickFormat('')
          )
          .selectAll('line')
          .style('stroke', '#e0e0e0')
          .style('stroke-opacity', 0.7);
        
        // 更新散点位置
        g.selectAll('.dot')
          .attr('cx', d => d.type === 'knowledge' ? newXScale(d.avg_mastery || 0) : null)
          .attr('cy', d => d.type === 'knowledge' ? newYScale(d.correct_rate) : null);
        
        // 更新三角形位置
        g.selectAll('.triangle')
          .attr('transform', d => d.type === 'sub_knowledge' ? `translate(${newXScale(d.avg_mastery || 0)}, ${newYScale(d.correct_rate)})` : null);
      });

    // 应用缩放行为到SVG
    svg.call(zoom);

    // 合并数据并添加类型标识
    const combinedData = [
      ...knowledgeData.map(d => ({ ...d, type: 'knowledge', name: d.knowledge })),
      ...subKnowledgeData.map(d => ({ ...d, type: 'sub_knowledge', name: d.sub_knowledge }))
    ];

    if (combinedData.length === 0) return;

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
      .domain([d3.min(combinedData, d => d.question_count), d3.max(combinedData, d => d.question_count)])
      .range([5, 15]);

    // 绘制X轴
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `${(d * 100).toFixed(0)}%`))
      .selectAll('text')
      .style('text-anchor', 'middle');

    // 添加X轴标签
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 10)
      .style('text-anchor', 'middle')
      .text('平均掌握程度');

    // 绘制Y轴
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale).tickFormat(d => `${(d * 100).toFixed(0)}%`));

    // 添加Y轴标签
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('正确率');

    // 添加网格线
    g.append('g')
      .attr('class', 'x-grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickSize(-innerHeight)
          .tickFormat('')
      )
      .selectAll('line')
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.7);

    g.append('g')
      .attr('class', 'y-grid')
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
    g.selectAll('.dot')
      .data(combinedData.filter(d => d.type === 'knowledge'))
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.avg_mastery || 0))
      .attr('cy', d => yScale(d.correct_rate))
      .attr('r', d => Math.sqrt(sizeScale(d.question_count)))
      .style('fill', d => {
        const diff = d.avg_mastery - d.correct_rate;
        if (diff > 0.15) return '#ff4d4f'; // 掌握度高但正确率低
        if (diff > 0.12) return '#faad14'; // 掌握度略高于正确率
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
        
        const typeLabel = d.type === 'knowledge' ? '知识点' : '子知识点';
        tooltip.html(`
          <strong>${typeLabel}:</strong> ${d.name}<br/>
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

    // 绘制三角形（子知识点）
    g.selectAll('.triangle')
      .data(combinedData.filter(d => d.type === 'sub_knowledge'))
      .enter().append('path')
      .attr('class', 'triangle')
      .attr('transform', d => `translate(${xScale(d.avg_mastery || 0)}, ${yScale(d.correct_rate)})`)
      .attr('d', d => {
        const size = sizeScale(d.question_count);
        return d3.symbol().type(d3.symbolTriangle).size(size * size * 3.14)();
      })
      .style('fill', d => {
        const diff = d.avg_mastery - d.correct_rate;
        if (diff > 0.15) return '#ff4d4f'; // 掌握度高但正确率低
        if (diff > 0.12) return '#faad14'; // 掌握度略高于正确率
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
        
        const typeLabel = d.type === 'knowledge' ? '知识点' : '子知识点';
        tooltip.html(`
          <strong>${typeLabel}:</strong> ${d.name}<br/>
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

    // 添加颜色图例
    const colorLegend = g.append('g')
      .attr('class', 'color-legend')
      .attr('transform', `translate(${innerWidth - 200}, 20)`);

    colorLegend.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('掌握度与正确率关系');

    const colorLegendData = [
      { color: '#ff4d4f', label: '掌握度高但正确率低' },
      { color: '#faad14', label: '掌握度略高于正确率' },
      { color: '#722ed1', label: '正确率高但掌握度低' },
      { color: '#52c41a', label: '掌握度与正确率匹配' }
    ];

    colorLegend.selectAll('.color-legend-item')
      .data(colorLegendData)
      .enter().append('g')
      .attr('class', 'color-legend-item')
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

    // 添加形状图例
    const shapeLegend = g.append('g')
      .attr('class', 'shape-legend')
      .attr('transform', `translate(20, 20)`);

    shapeLegend.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('类型');

    const shapeLegendData = [
      { shape: d3.symbolCircle, label: '知识点' },
      { shape: d3.symbolTriangle, label: '子知识点' }
    ];

    shapeLegend.selectAll('.shape-legend-item')
      .data(shapeLegendData)
      .enter().append('g')
      .attr('class', 'shape-legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 25})`)
      .each(function(d) {
        const g = d3.select(this);
        g.append('path')
          .attr('transform', 'translate(15, 0)')
          .attr('d', d3.symbol().type(d.shape).size(100))
          .style('fill', '#1890ff')
          .style('opacity', 0.7);
        g.append('text')
          .attr('x', 30)
          .attr('y', 0)
          .attr('dy', '0.35em')
          .style('font-size', '12px')
          .text(d.label);
      });

    // 添加大小图例
    const sizeLegend = g.append('g')
      .attr('class', 'size-legend')
      .attr('transform', `translate(20, 100)`);

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
  }, [knowledgeData, subKnowledgeData]);

  return (
    <div style={{ width: '100%', textAlign: 'center' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default CombinedKnowledgeScatterPlot;