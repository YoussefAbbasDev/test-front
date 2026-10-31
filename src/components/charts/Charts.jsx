// Recharts wrappers using the SEEDA palette. Colors read from CSS variables so a re-theme changes charts too.
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const css = (name) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace(/ /g, ',')})`;
export const palette = () => [css('--brand-600'), css('--navy-700'), css('--brand-300'), css('--success'), css('--warning'), css('--info'), css('--brand-800'), css('--danger'), css('--navy-500')];

const axis = { tick: { fontSize: 11, fill: '#8A8F9E' }, axisLine: false, tickLine: false };
const tooltip = { contentStyle: { borderRadius: 12, border: '1px solid rgb(230,230,238)', fontSize: 12, boxShadow: '0 12px 40px rgba(45,61,98,.12)' } };

export function ChartBox({ height = 260, children }) {
  return <div style={{ height }} dir="ltr"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

export function TrendChart({ data, x, series, height, area = true }) {
  const p = palette();
  const Comp = area ? AreaChart : LineChart;
  const Series = area ? Area : Line;
  return (
    <ChartBox height={height}>
      <Comp data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>{series.map((s, i) => <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color || p[i]} stopOpacity={0.25} /><stop offset="100%" stopColor={s.color || p[i]} stopOpacity={0} /></linearGradient>)}</defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
        <XAxis dataKey={x} {...axis} />
        <YAxis {...axis} />
        <Tooltip {...tooltip} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => <Series key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color || p[i]} fill={`url(#g-${s.key})`} strokeWidth={2} dot={false} />)}
      </Comp>
    </ChartBox>
  );
}

export function BarsChart({ data, x, series, height, horizontal, stacked }) {
  const p = palette();
  return (
    <ChartBox height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 10, right: 10, left: horizontal ? 10 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? <><XAxis type="number" {...axis} /><YAxis type="category" dataKey={x} width={120} {...axis} /></> : <><XAxis dataKey={x} {...axis} /><YAxis {...axis} /></>}
        <Tooltip {...tooltip} cursor={{ fill: 'rgba(90,66,147,.06)' }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color || p[i]} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} stackId={stacked ? 'a' : undefined} maxBarSize={36} />)}
      </BarChart>
    </ChartBox>
  );
}

export function DonutChart({ data, nameKey = 'name', valueKey = 'value', height = 240 }) {
  const p = palette();
  const { i18n } = useTranslation();
  return (
    <ChartBox height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={p[i % p.length]} />)}
        </Pie>
        <Tooltip {...tooltip} />
        <Legend layout="vertical" align={i18n.dir() === 'rtl' ? 'left' : 'right'} verticalAlign="middle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartBox>
  );
}
