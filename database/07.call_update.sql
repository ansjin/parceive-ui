UPDATE Call SET CallGroup=(SELECT g.Id FROM CallGroup g WHERE g.Caller = Call.Caller AND g.Function = Call.Function) IS NOT NULL;
UPDATE Call SET CallGroup=(SELECT g.Id FROM CallGroup g WHERE Call.Function = g.Function) WHERE Call.Caller IS NULL;
UPDATE Call SET CallsOther=(SELECT COUNT(t.Id) FROM Call t WHERE t.Caller = Id );
UPDATE CallGroup SET Parent=(SELECT c.CallGroup FROM Call c WHERE c.Id = CallGroup.Caller);

CREATE INDEX IF NOT EXISTS CALL_TABLE_CALL_GROUP ON Call(CallGroup);
CREATE INDEX IF NOT EXISTS CALL_GROUP_TABLE_PARENT ON CallGroup(Parent);
