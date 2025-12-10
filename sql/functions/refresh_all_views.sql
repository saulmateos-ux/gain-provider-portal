/**
 * Refresh All Materialized Views Function
 *
 * CRITICAL RULE #8: Refresh materialized views after data changes
 * Call this function after imports, updates, or deletes
 */

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE(view_name TEXT, refresh_status TEXT, duration_ms INTEGER) AS $$
DECLARE
  view_record RECORD;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration INTEGER;
BEGIN
  -- Array of all materialized views in dependency order
  FOR view_record IN
    SELECT unnest(ARRAY[
      'provider_kpi_summary_mv',
      'aging_analysis_mv',
      'law_firm_performance_mv',
      'case_status_distribution_mv',
      'tranche_performance_mv'
    ]) AS view
  LOOP
    BEGIN
      start_time := clock_timestamp();

      -- Refresh the materialized view
      EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_record.view);

      end_time := clock_timestamp();
      duration := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;

      view_name := view_record.view;
      refresh_status := 'SUCCESS';
      duration_ms := duration;
      RETURN NEXT;

      RAISE NOTICE 'Refreshed % in % ms', view_record.view, duration;

    EXCEPTION WHEN OTHERS THEN
      view_name := view_record.view;
      refresh_status := 'FAILED: ' || SQLERRM;
      duration_ms := 0;
      RETURN NEXT;

      RAISE WARNING 'Failed to refresh %: %', view_record.view, SQLERRM;
    END;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION refresh_all_materialized_views() IS 'Refreshes all materialized views and returns timing information';

-- Usage example:
-- SELECT * FROM refresh_all_materialized_views();
