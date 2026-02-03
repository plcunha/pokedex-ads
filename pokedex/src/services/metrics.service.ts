/**
 * Metrics Service
 * Tracks application metrics for monitoring and observability
 */

interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
}

interface MetricsSummary {
  requests: {
    total: number;
    byStatus: Record<string, number>;
    byMethod: Record<string, number>;
    byPath: Record<string, number>;
  };
  responseTime: {
    avg: number;
    min: number;
    max: number;
    p95: number;
  };
  errors: {
    total: number;
    rate: number;
  };
  uptime: number;
  startTime: Date;
}

class MetricsService {
  private requests: RequestMetric[] = [];
  private startTime: Date = new Date();
  private maxStoredRequests = 10000;

  /**
   * Record a request metric
   */
  recordRequest(metric: Omit<RequestMetric, 'timestamp'>): void {
    this.requests.push({
      ...metric,
      timestamp: new Date(),
    });

    // Prevent memory leak by limiting stored requests
    if (this.requests.length > this.maxStoredRequests) {
      this.requests = this.requests.slice(-this.maxStoredRequests / 2);
    }
  }

  /**
   * Get metrics summary
   */
  getSummary(): MetricsSummary {
    const total = this.requests.length;
    const responseTimes = this.requests.map(r => r.responseTime).sort((a, b) => a - b);
    
    const byStatus: Record<string, number> = {};
    const byMethod: Record<string, number> = {};
    const byPath: Record<string, number> = {};
    let errorCount = 0;

    for (const req of this.requests) {
      // Count by status code group (2xx, 3xx, 4xx, 5xx)
      const statusGroup = `${Math.floor(req.statusCode / 100)}xx`;
      byStatus[statusGroup] = (byStatus[statusGroup] || 0) + 1;

      // Count by method
      byMethod[req.method] = (byMethod[req.method] || 0) + 1;

      // Count by path (normalize dynamic segments)
      const normalizedPath = this.normalizePath(req.path);
      byPath[normalizedPath] = (byPath[normalizedPath] || 0) + 1;

      // Count errors (4xx and 5xx)
      if (req.statusCode >= 400) {
        errorCount++;
      }
    }

    return {
      requests: {
        total,
        byStatus,
        byMethod,
        byPath,
      },
      responseTime: {
        avg: total > 0 ? responseTimes.reduce((a, b) => a + b, 0) / total : 0,
        min: responseTimes[0] || 0,
        max: responseTimes[responseTimes.length - 1] || 0,
        p95: this.percentile(responseTimes, 95),
      },
      errors: {
        total: errorCount,
        rate: total > 0 ? (errorCount / total) * 100 : 0,
      },
      uptime: process.uptime(),
      startTime: this.startTime,
    };
  }

  /**
   * Get recent requests (for debugging)
   */
  getRecentRequests(limit = 100): RequestMetric[] {
    return this.requests.slice(-limit);
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.requests = [];
    this.startTime = new Date();
  }

  /**
   * Normalize path to group dynamic segments
   */
  private normalizePath(path: string): string {
    // Replace pokemon names/IDs with placeholder
    return path
      .replace(/\/pokemon\/[^/]+/, '/pokemon/:name')
      .replace(/\?.*$/, ''); // Remove query strings
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)] ?? 0;
  }
}

// Singleton instance
export const metricsService = new MetricsService();
