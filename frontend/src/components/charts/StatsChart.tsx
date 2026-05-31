import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { StatsHistoryPoint } from "../../types";
import { format } from "date-fns";

interface StatsChartProps {
  data: StatsHistoryPoint[];
  metric: "cpu" | "memory" | "network" | "block";
}

function fmt(bytes: number) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)}GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${bytes}B`;
}

export function StatsChart({ data, metric }: StatsChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    time: format(new Date(d.recorded_at), "HH:mm"),
  }));

  const tickStyle = { fill: "#64748b", fontSize: 11 };
  const gridColor = "#1e293b";

  if (metric === "cpu") {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="time" tick={tickStyle} />
          <YAxis tick={tickStyle} unit="%" domain={[0, "auto"]} width={42} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 6 }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(v: number) => [`${v.toFixed(2)}%`, "CPU"]}
          />
          <Line
            type="monotone"
            dataKey="cpu_percent"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={1.5}
            name="CPU %"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (metric === "memory") {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="time" tick={tickStyle} />
          <YAxis tick={tickStyle} unit="MB" width={52} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 6 }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(v: number) => [`${v.toFixed(1)} MB`, "RAM"]}
          />
          <Line
            type="monotone"
            dataKey="mem_usage_mb"
            stroke="#8b5cf6"
            dot={false}
            strokeWidth={1.5}
            name="RAM MB"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (metric === "network") {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="time" tick={tickStyle} />
          <YAxis tick={tickStyle} tickFormatter={fmt} width={62} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 6 }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(v: number, name: string) => [fmt(v), name]}
          />
          <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
          <Line type="monotone" dataKey="net_rx_bytes" stroke="#10b981" dot={false} strokeWidth={1.5} name="RX" />
          <Line type="monotone" dataKey="net_tx_bytes" stroke="#f59e0b" dot={false} strokeWidth={1.5} name="TX" />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // block
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="time" tick={tickStyle} />
        <YAxis tick={tickStyle} tickFormatter={fmt} width={62} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 6 }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(v: number, name: string) => [fmt(v), name]}
        />
        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
        <Line type="monotone" dataKey="block_read_bytes" stroke="#06b6d4" dot={false} strokeWidth={1.5} name="Read" />
        <Line type="monotone" dataKey="block_write_bytes" stroke="#ec4899" dot={false} strokeWidth={1.5} name="Write" />
      </LineChart>
    </ResponsiveContainer>
  );
}
