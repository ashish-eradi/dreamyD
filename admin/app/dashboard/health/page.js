import { getAdminClient } from '../../../lib/supabase';
import SectionHeader from '../../../components/SectionHeader';
import StatCard from '../../../components/StatCard';
import RetryButton from './RetryButton';
import { format, subHours, subDays } from 'date-fns';

async function fetchHealthData() {
  const db  = getAdminClient();
  const now = new Date();
  const since24h = subHours(now, 24).toISOString();
  const since7d  = subDays(now, 7).toISOString();

  const [
    { data: failedJobs },
    { data: apiLogs24h },
    { data: apiLogs7d  },
  ] = await Promise.all([
    db.from('failed_jobs').select('*').order('created_at', { ascending: false }).limit(50),
    db.from('api_usage_logs').select('service, created_at, metadata').gte('created_at', since24h),
    db.from('api_usage_logs').select('service, cost_usd').gte('created_at', since7d),
  ]);

  const jobs = failedJobs ?? [];
  const logs24h = apiLogs24h ?? [];

  // Counts
  const failedLast24h   = jobs.filter(j => j.created_at >= since24h && j.status === 'failed').length;
  const failedPending   = jobs.filter(j => j.status === 'failed').length;
  const retrying        = jobs.filter(j => j.status === 'retrying').length;

  // Whisper call count in 24h
  const whisperCalls24h = logs24h.filter(l => l.service === 'whisper').length;
  const gptCalls24h     = logs24h.filter(l => l.service === 'gpt-4o' || l.service === 'gemini-flash').length;
  const claudeCalls24h  = logs24h.filter(l => l.service === 'claude-sonnet').length;

  // Total calls 7d
  const totalCalls7d = (apiLogs7d ?? []).length;
  const totalCost7d  = (apiLogs7d ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);
  const avgCostPerCall = totalCalls7d > 0 ? totalCost7d / totalCalls7d : 0;

  // Group failed by type
  const byType = {};
  jobs.filter(j => j.status === 'failed').forEach(j => {
    byType[j.job_type] = (byType[j.job_type] ?? 0) + 1;
  });

  return {
    failedLast24h, failedPending, retrying,
    whisperCalls24h, gptCalls24h, claudeCalls24h,
    totalCalls7d, avgCostPerCall,
    byType,
    recentJobs: jobs.slice(0, 20),
  };
}

export default async function HealthPage() {
  const d = await fetchHealthData();

  const statusColors = {
    failed:    'bg-red-50 text-red-600',
    retrying:  'bg-amber-50 text-amber-600',
    resolved:  'bg-emerald-50 text-emerald-600',
  };
  const typeLabels = {
    transcription: 'Transcription',
    analysis:      'AI Analysis',
    tagging:       'Tagging',
  };

  return (
    <div>
      <SectionHeader title="App Health" sub="AI job queue and API call metrics" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Failed jobs (24h)"    value={d.failedLast24h}     color={d.failedLast24h > 0 ? 'red' : 'green'} />
        <StatCard label="Pending failures"     value={d.failedPending}     color={d.failedPending > 5 ? 'red' : 'default'} sub={`${d.retrying} retrying`} />
        <StatCard label="API calls (24h)"      value={d.whisperCalls24h + d.gptCalls24h + d.claudeCalls24h} color="default"
          sub={`Whisper ${d.whisperCalls24h} · AI ${d.gptCalls24h} · Claude ${d.claudeCalls24h}`} />
        <StatCard label="Total calls (7d)"     value={d.totalCalls7d}      color="default" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Failure breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Failures by type</p>
          {Object.keys(d.byType).length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-600">
              <span className="text-lg">✓</span>
              <span className="text-sm font-medium">No pending failures</span>
            </div>
          ) : Object.entries(d.byType).map(([type, count]) => (
            <div key={type} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700">{typeLabels[type] ?? type}</span>
              <span className="text-sm font-semibold text-red-600">{count}</span>
            </div>
          ))}

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Guidance</p>
            <ul className="space-y-1.5 text-xs text-gray-500">
              <li>• Transcription errors → usually audio format or size</li>
              <li>• Analysis errors → usually rate limit or token length</li>
              <li>• Tagging errors → usually malformed transcript</li>
            </ul>
          </div>
        </div>

        {/* Failed job queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Failed job queue</h2>
            {d.failedPending > 0 && (
              <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                {d.failedPending} need attention
              </span>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Error</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Retries</th>
                <th className="text-left px-5 py-3 font-medium">Time</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {d.recentJobs.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                  <span className="text-2xl block mb-2">✓</span>
                  No failed jobs — everything is running cleanly
                </td></tr>
              ) : d.recentJobs.map(job => (
                <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-700 text-xs">{typeLabels[job.job_type] ?? job.job_type}</td>
                  <td className="px-5 py-3 text-xs text-gray-500 max-w-xs truncate">{job.error_message ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">{job.retry_count ?? 0}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">
                    {format(new Date(job.created_at), 'dd MMM, HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    {job.status === 'failed' && <RetryButton jobId={job.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
