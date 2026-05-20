import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  AlertTriangle, ArrowLeft, BarChart3, BriefcaseBusiness, CalendarClock,
  ChevronRight, Clock, Database, Filter, Flame, LineChart as LineChartIcon,
  RefreshCw, Target, TrendingUp, Users, WalletCards
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSalesDashboardData } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

const ALL = '__all__';
const STALE_DAYS = 14;
const HIGH_VALUE_THRESHOLD = 100000;
const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

function parseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+.*)?$/);
  if (dmy) {
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    const month = Number(dmy[2]) - 1;
    const day = Number(dmy[1]);
    return new Date(year, month, day);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateLabel(value) {
  const date = parseDate(value);
  if (!date) return 'Not set';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toDateKey(date) {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(fromDate, toDate = new Date()) {
  if (!fromDate) return null;
  return Math.floor((startOfDay(toDate) - startOfDay(fromDate)) / 86400000);
}

function contains(value, token) {
  return String(value || '').toLowerCase().includes(token.toLowerCase());
}

function uniqueBy(rows, key) {
  const seen = new Set();
  return rows.filter(row => {
    const id = row[key];
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function pct(value, total) {
  if (!total) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

function isQualified(row) {
  const status = String(row.qualification_status || '').toUpperCase();
  return status.includes('QUALIFIED') && !status.includes('NOT');
}

function isNotQualified(row) {
  const status = String(row.qualification_status || '').toUpperCase();
  return status.includes('NOT QUALIFIED') || contains(row.qualification_status, 'غير مؤهل');
}

function isDiscovery(row) {
  return contains(row.qualification_status, 'DISCOVERY') || contains(row.qualification_status, 'استكشاف');
}

function isConvertedIntake(row) {
  return contains(row.lifecycle_stage, 'Converted') || contains(row.current_outcome, 'Converted');
}

function isWon(row) {
  return contains(row.opportunity_stage, 'Won') || Boolean(row.win_reason) || Number(row.actual_revenue) > 0;
}

function isLost(row) {
  return contains(row.opportunity_stage, 'Lost') || Boolean(row.lost_reason);
}

function isCanceled(row) {
  return contains(row.opportunity_stage, 'Canceled') || contains(row.opportunity_stage, 'Cancelled');
}

function isOpenOpportunity(row) {
  return !isWon(row) && !isLost(row) && !isCanceled(row);
}

function cleanLabel(label) {
  if (!label) return 'Unassigned';
  return String(label).replace(/\s+/g, ' ').trim();
}

function groupCount(rows, field, limit = 8) {
  const map = new Map();
  rows.forEach(row => {
    const key = cleanLabel(row[field]);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function groupSum(rows, field, valueField, limit = 8) {
  const map = new Map();
  rows.forEach(row => {
    const key = cleanLabel(row[field]);
    map.set(key, (map.get(key) || 0) + (Number(row[valueField]) || 0));
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function trendByDate(rows, dateField) {
  const map = new Map();
  rows.forEach(row => {
    const key = toDateKey(parseDate(row[dateField]));
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);
}

function getRecordDate(row, layer, dateMode) {
  if (dateMode === 'close') {
    return parseDate(row.close_date || row.converted_date || row.creation_date || row.qualification_date);
  }
  if (dateMode === 'qualification') {
    return parseDate(row.qualification_date || row.creation_date);
  }
  if (layer === 'pipeline') return parseDate(row.qualification_date);
  return parseDate(row.creation_date);
}

function StatCard({ title, value, sub, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-rose-50 text-rose-700 border-rose-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
  };
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
            {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
          </div>
          <div className={`rounded-xl border p-2 ${tones[tone] || tones.blue}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SimpleTable({ rows, columns, empty = 'No records found' }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map(col => <th key={col.key} className="px-4 py-3 font-semibold">{col.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length}>{empty}</td></tr>
            )}
            {rows.map((row, idx) => (
              <tr key={`${row.opportunity_id || row.intake_id || idx}-${idx}`} className="hover:bg-slate-50">
                {columns.map(col => <td key={col.key} className="px-4 py-3 text-slate-700">{col.render ? col.render(row) : row[col.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-950">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="h-72">{children}</CardContent>
    </Card>
  );
}

export default function SalesDashboard() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateMode: 'creation',
    startDate: '',
    endDate: '',
    portfolio: ALL,
    bdRep: ALL,
    stage: ALL,
    source: ALL,
    segment: ALL,
    industry: ALL,
    priority: ALL,
  });

  const loadData = async (force = false) => {
    setLoading(true);
    try {
      const data = await getSalesDashboardData(force);
      setPayload(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const source = payload || { intake: [], qualification: [], pipeline: [], options: {} };
    const start = filters.startDate ? startOfDay(new Date(filters.startDate)) : null;
    const end = filters.endDate ? startOfDay(new Date(filters.endDate)) : null;

    const matchCommon = (row, layer) => {
      const recordDate = getRecordDate(row, layer, filters.dateMode);
      if (start && (!recordDate || startOfDay(recordDate) < start)) return false;
      if (end && (!recordDate || startOfDay(recordDate) > end)) return false;
      if (filters.portfolio !== ALL && row.portfolio_name !== filters.portfolio) return false;
      if (filters.bdRep !== ALL && row.bd_rep !== filters.bdRep) return false;
      if (filters.stage !== ALL && row.opportunity_stage !== filters.stage) return false;
      if (filters.source !== ALL && (row.source_category || row.opportunity_source) !== filters.source) return false;
      if (filters.segment !== ALL && row.customer_segment !== filters.segment) return false;
      if (filters.industry !== ALL && row.industry !== filters.industry) return false;
      if (filters.priority !== ALL && row.priority !== filters.priority) return false;
      return true;
    };

    return {
      intake: source.intake.filter(row => matchCommon(row, 'intake')),
      qualification: source.qualification.filter(row => matchCommon(row, 'qualification')),
      pipeline: source.pipeline.filter(row => matchCommon(row, 'pipeline')),
      options: source.options || {},
    };
  }, [payload, filters]);

  const analytics = useMemo(() => {
    const intake = uniqueBy(filtered.intake, 'intake_id');
    const qualification = uniqueBy(filtered.qualification, 'opportunity_id');
    const pipeline = uniqueBy(filtered.pipeline, 'opportunity_id');
    const activePipeline = pipeline.filter(isOpenOpportunity);
    const won = pipeline.filter(isWon);
    const lost = pipeline.filter(isLost);
    const qualified = qualification.filter(isQualified);
    const discovery = qualification.filter(isDiscovery);
    const notQualified = qualification.filter(isNotQualified);
    const converted = intake.filter(isConvertedIntake);
    const pipelineValue = sum(activePipeline, 'expected_revenue');
    const weightedForecast = sum(activePipeline, 'weighted_revenue');
    const today = startOfDay(new Date());

    const overdueNextSteps = activePipeline.filter(row => {
      const next = parseDate(row.next_step_date);
      return next && startOfDay(next) < today;
    });
    const dueToday = activePipeline.filter(row => {
      const next = parseDate(row.next_step_date);
      return next && toDateKey(next) === toDateKey(today);
    });
    const stale = activePipeline.filter(row => {
      const last = parseDate(row.last_update_date || row.next_step_date || row.qualification_date);
      const age = daysBetween(last, today);
      return age !== null && age > STALE_DAYS;
    });
    const noOwner = activePipeline.filter(row => !row.bd_rep);
    const highValueAtRisk = activePipeline.filter(row =>
      Number(row.expected_revenue) >= HIGH_VALUE_THRESHOLD
      && (stale.includes(row) || overdueNextSteps.includes(row) || !row.planned_next_action)
    );

    const todayKey = toDateKey(today);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    const previousWeekStart = new Date(today);
    previousWeekStart.setDate(today.getDate() - 13);
    const previousWeekEnd = new Date(today);
    previousWeekEnd.setDate(today.getDate() - 7);

    const inRange = (dateValue, from, to) => {
      const date = parseDate(dateValue);
      return date && startOfDay(date) >= startOfDay(from) && startOfDay(date) <= startOfDay(to);
    };

    const weeklyIntake = intake.filter(row => inRange(row.creation_date, sevenDaysAgo, today));
    const weeklyQualified = qualified.filter(row => inRange(row.creation_date, sevenDaysAgo, today));
    const weeklyPipeline = pipeline.filter(row => inRange(row.qualification_date, sevenDaysAgo, today));
    const prevIntake = intake.filter(row => inRange(row.creation_date, previousWeekStart, previousWeekEnd));
    const prevQualified = qualified.filter(row => inRange(row.creation_date, previousWeekStart, previousWeekEnd));
    const prevPipeline = pipeline.filter(row => inRange(row.qualification_date, previousWeekStart, previousWeekEnd));

    return {
      intake,
      qualification,
      pipeline,
      activePipeline,
      won,
      lost,
      qualified,
      discovery,
      notQualified,
      converted,
      pipelineValue,
      weightedForecast,
      winRate: pct(won.length, won.length + lost.length),
      conversionRate: pct(converted.length, intake.length),
      qualificationRate: pct(qualified.length, qualification.length),
      alerts: {
        overdueNextSteps,
        dueToday,
        stale,
        noOwner,
        highValueAtRisk,
        total: overdueNextSteps.length + stale.length + noOwner.length + highValueAtRisk.length,
      },
      daily: {
        newIntakes: intake.filter(row => toDateKey(parseDate(row.creation_date)) === todayKey),
        newQualified: qualified.filter(row => toDateKey(parseDate(row.creation_date)) === todayKey),
        movedStage: pipeline.filter(row => toDateKey(parseDate(row.last_update_date)) === todayKey || toDateKey(parseDate(row.submission_date)) === todayKey),
        closed: pipeline.filter(row => toDateKey(parseDate(row.close_date)) === todayKey),
      },
      weekly: {
        intake: weeklyIntake,
        qualified: weeklyQualified,
        pipeline: weeklyPipeline,
        prevIntake,
        prevQualified,
        prevPipeline,
        pipelineGrowth: sum(weeklyPipeline, 'expected_revenue') - sum(prevPipeline, 'expected_revenue'),
      },
      charts: {
        intakeTrend: trendByDate(intake, 'creation_date'),
        sourcePerformance: groupCount(intake, 'source_category'),
        lifecycle: groupCount(intake, 'lifecycle_stage'),
        qualificationStatus: [
          { name: 'Qualified', value: qualified.length },
          { name: 'Discovery', value: discovery.length },
          { name: 'Not Qualified', value: notQualified.length },
        ],
        priorities: groupCount(qualification, 'priority'),
        stageCount: groupCount(activePipeline, 'opportunity_stage', 10),
        revenueByStage: groupSum(activePipeline, 'opportunity_stage', 'expected_revenue', 10),
        weightedByStage: groupSum(activePipeline, 'opportunity_stage', 'weighted_revenue', 10),
        portfolioRevenue: groupSum(activePipeline, 'portfolio_name', 'expected_revenue', 10),
        bdRevenue: groupSum(activePipeline, 'bd_rep', 'expected_revenue', 10),
        bdWorkload: groupCount(activePipeline, 'bd_rep', 10),
        lostReasons: groupCount(lost, 'lost_reason', 10),
        competitors: groupCount(lost.filter(row => row.competing_company), 'competing_company', 10),
      },
    };
  }, [filtered]);

  const options = filtered.options || {};
  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const resetFilters = () => setFilters({
    dateMode: 'creation', startDate: '', endDate: '', portfolio: ALL, bdRep: ALL,
    stage: ALL, source: ALL, segment: ALL, industry: ALL, priority: ALL,
  });

  if (loading && !payload) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-300" />
          <p className="text-sm text-slate-300">Loading sales operations dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 light-theme text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="sm" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4" />
                Calculator
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-950">Sales Operations Dashboard</h1>
              <p className="text-xs text-slate-500">Executive pipeline, daily actions, and weekly sales reporting</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="border-blue-200 bg-blue-50 text-blue-700">Google Sheet Live</Badge>
            <Button onClick={() => loadData(true)} disabled={loading} className="bg-slate-950 text-white hover:bg-slate-800">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1680px] space-y-6 px-6 py-6">
        <Card className="border-blue-200/70 bg-gradient-to-r from-blue-50 via-white to-indigo-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Primary Portfolio</p>
                <p className="text-sm text-slate-600">Choose the main portfolio to focus all dashboard work on.</p>
              </div>
              <div className="w-full md:w-[360px]">
                <Select value={filters.portfolio} onValueChange={value => updateFilter('portfolio', value)}>
                  <SelectTrigger className="border-blue-200 bg-white text-slate-800 shadow-sm">
                    <SelectValue placeholder="Select portfolio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Portfolios</SelectItem>
                    {(options.portfolio_names || []).map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter className="h-4 w-4" />
              Global Filters
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Select value={filters.dateMode} onValueChange={value => updateFilter('dateMode', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="creation">Creation Date</SelectItem>
                  <SelectItem value="qualification">Qualification Date</SelectItem>
                  <SelectItem value="close">Close Date</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={filters.startDate} onChange={e => updateFilter('startDate', e.target.value)} />
              <Input type="date" value={filters.endDate} onChange={e => updateFilter('endDate', e.target.value)} />
              <FilterSelect value={filters.bdRep} onChange={value => updateFilter('bdRep', value)} label="All BD Reps" options={options.bd_reps} />
              <FilterSelect value={filters.stage} onChange={value => updateFilter('stage', value)} label="All Stages" options={options.opportunity_stages} />
              <FilterSelect value={filters.source} onChange={value => updateFilter('source', value)} label="All Sources" options={options.source_categories} />
              <FilterSelect value={filters.segment} onChange={value => updateFilter('segment', value)} label="All Segments" options={options.customer_segments} />
              <FilterSelect value={filters.industry} onChange={value => updateFilter('industry', value)} label="All Industries" options={options.industries} />
              <div className="flex gap-2">
                <FilterSelect value={filters.priority} onChange={value => updateFilter('priority', value)} label="All Priorities" options={options.priorities} />
                <Button variant="outline" onClick={resetFilters} className="border-slate-300 bg-white text-slate-700">Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard title="Total Intake" value={formatNumber(analytics.intake.length)} sub={`${analytics.conversionRate} converted`} icon={Database} tone="blue" />
          <StatCard title="Qualified Opps" value={formatNumber(analytics.qualified.length)} sub={`${analytics.qualificationRate} qualification rate`} icon={Target} tone="green" />
          <StatCard title="Pipeline Value" value={formatCurrency(analytics.pipelineValue)} sub={`${analytics.activePipeline.length} open deals`} icon={WalletCards} tone="blue" />
          <StatCard title="Weighted Forecast" value={formatCurrency(analytics.weightedForecast)} sub="Revenue x probability" icon={TrendingUp} tone="green" />
          <StatCard title="Win Rate" value={analytics.winRate} sub={`${analytics.won.length} won / ${analytics.lost.length} lost`} icon={BriefcaseBusiness} tone="slate" />
          <StatCard title="Alerts" value={formatNumber(analytics.alerts.total)} sub="Overdue, stale, missing owner" icon={AlertTriangle} tone={analytics.alerts.total ? 'red' : 'green'} />
        </div>

        <Tabs defaultValue="executive" className="space-y-4">
          <TabsList className="grid h-auto grid-cols-2 gap-1 bg-white p-1 shadow-sm md:grid-cols-4 xl:grid-cols-7">
            <TabsTrigger value="executive">Executive</TabsTrigger>
            <TabsTrigger value="intake">Intake</TabsTrigger>
            <TabsTrigger value="qualification">Qualification</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="performance">BDs</TabsTrigger>
            <TabsTrigger value="workload">Workload</TabsTrigger>
            <TabsTrigger value="loss">Loss</TabsTrigger>
          </TabsList>

          <TabsContent value="executive" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ChartCard title="Funnel Summary" description="Intake to qualified to active pipeline">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Intake', value: analytics.intake.length },
                    { name: 'Converted', value: analytics.converted.length },
                    { name: 'Qualified', value: analytics.qualified.length },
                    { name: 'Pipeline', value: analytics.activePipeline.length },
                    { name: 'Won', value: analytics.won.length },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Revenue by Stage" description="Open pipeline distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.charts.revenueByStage}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis tickFormatter={value => `${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={value => formatCurrency(value)} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <DailyReport analytics={analytics} compact />
            </div>
            <WeeklyReport analytics={analytics} />
          </TabsContent>

          <TabsContent value="intake" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ChartCard title="Intake Volume Trend" description="Last 30 active dates">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.charts.intakeTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#dbeafe" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Source Performance" description="Lead source count">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.charts.sourcePerformance} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                      {analytics.charts.sourcePerformance.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Lifecycle Stage" description="Intake lifecycle distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.charts.lifecycle} layout="vertical">
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <SimpleTable rows={analytics.intake.slice(0, 80)} columns={[
              { key: 'intake_id', label: 'Intake ID' },
              { key: 'creation_date', label: 'Created' },
              { key: 'portfolio_name', label: 'Portfolio' },
              { key: 'source_category', label: 'Source' },
              { key: 'lifecycle_stage', label: 'Lifecycle' },
              { key: 'followup_status', label: 'Follow-up' },
              { key: 'organization_name', label: 'Organization' },
            ]} />
          </TabsContent>

          <TabsContent value="qualification" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ChartCard title="Qualification Status" description="Qualified, discovery, not qualified">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.charts.qualificationStatus} dataKey="value" nameKey="name" outerRadius={90} label>
                      {analytics.charts.qualificationStatus.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Priority Distribution" description="Qualification priority coverage">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.charts.priorities}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Assignment Coverage" description="Opportunities by assigned BD">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupCount(analytics.qualification, 'bd_rep', 8)} layout="vertical">
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#06b6d4" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <SimpleTable rows={analytics.qualification.slice(0, 80)} columns={[
              { key: 'opportunity_id', label: 'Opportunity' },
              { key: 'creation_date', label: 'Created' },
              { key: 'qualification_status', label: 'Status' },
              { key: 'priority', label: 'Priority' },
              { key: 'bd_rep', label: 'BD Rep' },
              { key: 'portfolio_name', label: 'Portfolio' },
              { key: 'disqualification_reason', label: 'Disqualification' },
            ]} />
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ChartCard title="Stage Funnel" description="Open opportunities by stage">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.charts.stageCount}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Weighted Pipeline" description="Expected revenue x probability">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.charts.weightedByStage}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis tickFormatter={value => `${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={value => formatCurrency(value)} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Portfolio Revenue" description="Open pipeline by portfolio">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.charts.portfolioRevenue} layout="vertical">
                    <XAxis type="number" tickFormatter={value => `${Math.round(value / 1000)}k`} />
                    <YAxis dataKey="name" type="category" width={95} />
                    <Tooltip formatter={value => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <PipelineTable rows={analytics.activePipeline} />
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard title="Revenue Contribution by BD" description="Open pipeline expected revenue">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.charts.bdRevenue} layout="vertical">
                    <XAxis type="number" tickFormatter={value => `${Math.round(value / 1000)}k`} />
                    <YAxis dataKey="name" type="category" width={130} />
                    <Tooltip formatter={value => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#2563eb" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Workload Heatmap" description="Open opportunity count by BD">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.charts.bdWorkload}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <SimpleTable rows={analytics.activePipeline.slice(0, 80)} columns={[
              { key: 'bd_rep', label: 'BD Rep' },
              { key: 'opportunity_id', label: 'Opportunity' },
              { key: 'organization_name', label: 'Client' },
              { key: 'opportunity_stage', label: 'Stage' },
              { key: 'expected_revenue', label: 'Revenue', render: row => formatCurrency(row.expected_revenue) },
              { key: 'next_step_date', label: 'Next Step' },
            ]} />
          </TabsContent>

          <TabsContent value="workload" className="space-y-4">
            <DailyReport analytics={analytics} />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <AlertList title="Overdue Next Steps" icon={CalendarClock} rows={analytics.alerts.overdueNextSteps} />
              <AlertList title="Stale Opportunities" icon={Clock} rows={analytics.alerts.stale} />
            </div>
          </TabsContent>

          <TabsContent value="loss" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard title="Lost Reasons" description="Why opportunities are lost">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.charts.lostReasons} layout="vertical">
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={170} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#ef4444" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Competitor Analysis" description="Competitors named in lost deals">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.charts.competitors}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#64748b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <SimpleTable rows={analytics.lost.slice(0, 80)} columns={[
              { key: 'opportunity_id', label: 'Opportunity' },
              { key: 'organization_name', label: 'Client' },
              { key: 'bd_rep', label: 'BD Rep' },
              { key: 'lost_reason', label: 'Lost Reason' },
              { key: 'competing_company', label: 'Competitor' },
              { key: 'expected_revenue', label: 'Expected Revenue', render: row => formatCurrency(row.expected_revenue) },
            ]} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function FilterSelect({ value, onChange, label, options = [] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="min-w-0">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}</SelectItem>
        {(options || []).map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function PipelineTable({ rows }) {
  const [expandedId, setExpandedId] = useState(null);
  const toggleExpanded = (id) => setExpandedId(prev => (prev === id ? null : id));

  const stageTone = (stage) => {
    const value = String(stage || '').toLowerCase();
    if (value.includes('proposal') || value.includes('negotiation')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (value.includes('qualified') || value.includes('review')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (value.includes('risk') || value.includes('hold')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  if (!rows?.length) {
    return (
      <Card className="border-slate-200 bg-white/90 shadow-sm">
        <CardContent className="p-8 text-center text-slate-500">
          No opportunities found for current filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rows.slice(0, 120).map((row, index) => {
        const rowId = row.opportunity_id || row.intake_id || `row-${index}`;
        const isExpanded = expandedId === rowId;
        return (
          <Card
            key={rowId}
            className="overflow-hidden border-slate-200/80 bg-white/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <button
              type="button"
              onClick={() => toggleExpanded(rowId)}
              className="w-full text-left"
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge className={`border ${stageTone(row.opportunity_stage)}`}>
                        {row.opportunity_stage || 'No stage'}
                      </Badge>
                      <Badge className="border border-violet-200 bg-violet-50 text-violet-700">
                        {row.proposal_status || 'Proposal N/A'}
                      </Badge>
                    </div>
                    <p className="truncate text-sm font-bold text-slate-900">
                      {row.organization_name || row.opportunity_name || row.opportunity_id}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-slate-500">
                      {row.opportunity_id || 'No ID'} • {row.portfolio_name || 'No portfolio'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Expected Revenue</p>
                      <p className="text-xs font-bold text-slate-900">{formatCurrency(row.expected_revenue || 0)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Probability</p>
                      <p className="text-xs font-bold text-slate-900">{Math.round((row.probability || 0) * 100)}%</p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDateLabel(row.last_update_date)}
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-blue-600">
                    {isExpanded ? 'Hide details' : 'Show details'}
                    <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </CardContent>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-200 bg-gradient-to-r from-blue-50/60 via-white to-violet-50/60 px-4 py-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Next Action</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{row.planned_next_action || 'No next action defined'}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Next Step Date</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateLabel(row.next_step_date)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Last Update Date</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateLabel(row.last_update_date)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Weighted Revenue</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(row.weighted_revenue || 0)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Close Date</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateLabel(row.close_date)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">BD Owner:</span> {row.bd_rep || 'Unassigned'}
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <BriefcaseBusiness className="h-4 w-4 text-violet-600" />
                    <span className="font-medium">Client:</span> {row.organization_name || 'Unknown'}
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function AlertList({ title, icon: Icon, rows }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950">
          <Icon className="h-4 w-4 text-rose-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">No urgent records.</p>}
        {rows.slice(0, 8).map(row => (
          <div key={row.opportunity_id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <p className="font-semibold text-slate-900">{row.organization_name || row.opportunity_name || row.opportunity_id}</p>
              <p className="text-xs text-slate-500">{row.bd_rep || 'Missing owner'} - {row.opportunity_stage || 'No stage'}</p>
            </div>
            <Badge className="bg-rose-50 text-rose-700">{formatCurrency(row.expected_revenue || 0)}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DailyReport({ analytics, compact = false }) {
  const bdToday = groupCount([
    ...analytics.daily.newQualified,
    ...analytics.daily.movedStage,
    ...analytics.alerts.dueToday,
  ], 'bd_rep', 6);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950">
          <Flame className="h-4 w-4 text-orange-500" />
          Daily Sales Operations Report
        </CardTitle>
        <CardDescription>Single-screen morning standup view</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MiniMetric label="New Intakes" value={analytics.daily.newIntakes.length} />
          <MiniMetric label="New Qualified" value={analytics.daily.newQualified.length} />
          <MiniMetric label="Stage Updates" value={analytics.daily.movedStage.length} />
          <MiniMetric label="Closed Today" value={analytics.daily.closed.length} />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <RiskPill label="Overdue follow-ups" value={analytics.alerts.overdueNextSteps.length} tone="red" />
          <RiskPill label="Due today" value={analytics.alerts.dueToday.length} tone="amber" />
          <RiskPill label="Stuck > 14 days" value={analytics.alerts.stale.length} tone="red" />
        </div>
        {!compact && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AlertList title="Action Required Today" icon={ChevronRight} rows={[...analytics.alerts.dueToday, ...analytics.alerts.overdueNextSteps]} />
            <ChartCard title="BD Performance Today" description="Activity count per owner">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bdToday}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeeklyReport({ analytics }) {
  const weeklyPipelineValue = sum(analytics.weekly.pipeline, 'expected_revenue');
  const previousPipelineValue = sum(analytics.weekly.prevPipeline, 'expected_revenue');
  const pipelineDelta = weeklyPipelineValue - previousPipelineValue;

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-950">
          <LineChartIcon className="h-4 w-4 text-blue-600" />
          Weekly Executive Sales Report
        </CardTitle>
        <CardDescription>Strategic 2-minute view for leadership review</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <MiniMetric label="Weekly Intake" value={analytics.weekly.intake.length} sub={`Prev ${analytics.weekly.prevIntake.length}`} />
        <MiniMetric label="Weekly Qualified" value={analytics.weekly.qualified.length} sub={`Prev ${analytics.weekly.prevQualified.length}`} />
        <MiniMetric label="Weekly Pipeline" value={formatCurrency(weeklyPipelineValue)} sub={`${pipelineDelta >= 0 ? '+' : ''}${formatCurrency(pipelineDelta)} WoW`} />
        <MiniMetric label="Weighted Pipeline" value={formatCurrency(analytics.weightedForecast)} sub="Current open forecast" />
        <MiniMetric label="Risk Summary" value={analytics.alerts.highValueAtRisk.length} sub="High value at risk" />
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function RiskPill({ label, value, tone }) {
  const styles = tone === 'red'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';
  return (
    <div className={`rounded-xl border p-3 ${styles}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
