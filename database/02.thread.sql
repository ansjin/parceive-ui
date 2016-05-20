INSERT INTO Thread (Id, CreateInstruction, JoinInstruction, Process, StartTime,
   EndTSC, EndTime, TSCPerMillisecond) SELECT
  t.Id,
  t.CreateInstruction,
  t.JoinInstruction,
  t.Process,
  t.StartTime,
  t.EndTSC,
  t.EndTime,
  t.EndTSC / (
    (
      JulianDay(t.EndTime) - JulianDay(t.StartTime)
    ) * 24 * 60 * 60 * 1000
  )
FROM ThreadOld t;
DROP TABLE ThreadOld;
