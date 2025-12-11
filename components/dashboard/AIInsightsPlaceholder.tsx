/**
 * AI Insights Placeholder Component
 *
 * Placeholder for Google Gemini 3 Pro AI insights
 * (Will be implemented in Phase 4)
 */

import { Sparkles, TrendingUp } from 'lucide-react';

export function AIInsightsPlaceholder() {
  return (
    <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg border border-teal-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-teal-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          AI-Powered Insights
        </h3>
        <span className="ml-auto text-xs font-medium text-teal-700 bg-teal-100 px-2 py-1 rounded-full">
          Powered by Gemini 3 Pro
        </span>
      </div>

      {/* Placeholder Content */}
      <div className="space-y-4">
        {/* Sample Insight 1 */}
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">OBSERVATION</h4>
            <p className="text-sm text-gray-600">
              Your collection rate improved 2.3% this quarter, driven primarily by
              top-performing law firms. AI-powered trend analysis coming soon.
            </p>
          </div>
        </div>

        {/* Sample Insight 2 */}
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <span className="text-lg">💡</span>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">RECOMMENDATION</h4>
            <p className="text-sm text-gray-600">
              AI will identify at-risk cases and provide actionable recommendations
              to improve portfolio performance.
            </p>
          </div>
        </div>

        {/* Sample Insight 3 */}
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">PREDICTION</h4>
            <p className="text-sm text-gray-600">
              Gemini 3 Pro will forecast collections based on current pipeline,
              providing confidence intervals and key drivers.
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="mt-6 pt-4 border-t border-teal-200">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            AI insights implementation scheduled for Phase 4
          </p>
          <button
            disabled
            className="text-xs font-medium text-teal-600 bg-teal-100 px-3 py-1.5 rounded-lg opacity-50 cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}
