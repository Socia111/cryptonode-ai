-- Clean up all mock/demo/test data
DELETE FROM signals WHERE source IN ('fresh_live_demo', 'demo', 'mock', 'test', 'fresh_demo', 'comprehensive_live_system');

-- Remove test execution orders
DELETE FROM execution_orders WHERE credentials_source = 'test' OR real_trade = false;

-- Clean up edge event logs for tests
DELETE FROM edge_event_log WHERE fn LIKE '%test%' OR fn LIKE '%demo%';