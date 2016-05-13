INSERT INTO CallGroupReference SELECT
  NULL,
  c.CallGroup AS CallGroup,
  cr.Reference AS Reference,
  SUM(cr.Read) AS Read,
  SUM(cr.Write) AS Write
FROM Call c, CallReference cr WHERE
  cr.Call = c.Id
GROUP BY c.CallGroup, cr.Reference;

CREATE INDEX IF NOT EXISTS CALL_GROUP_REFERENCE_TABLE_CALL_ID ON CallGroupReference(Id);
CREATE INDEX IF NOT EXISTS CALL_GROUP_REFERENCE_TABLE_CALL_GROUP ON CallGroupReference(CallGroup);
CREATE INDEX IF NOT EXISTS CALL_GROUP_REFERENCE_TABLE_REFERENCE ON CallGroupReference(Reference);
