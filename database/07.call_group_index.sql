CREATE INDEX IF NOT EXISTS CALL_GROUP_TABLE_ID ON CallGroup(Id);
CREATE INDEX IF NOT EXISTS CALL_GROUP_TABLE_FUNCTION ON CallGroup(Function);
CREATE INDEX IF NOT EXISTS CALL_GROUP_TABLE_CALLER ON CallGroup(Caller);
CREATE INDEX IF NOT EXISTS CALL_GROUP_TABLE_FUNCTION_CALLER ON CallGroup(Function, Caller);
