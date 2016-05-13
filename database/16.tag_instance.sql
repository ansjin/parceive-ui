WITH ThreadTimings AS (
  SELECT thr.TSCPerMillisecond AS TSCPerMillisecond, thr.StartTime AS StartTime FROM Thread thr, Call c, Segment s, InstructionTagInstance iti, Instruction i WHERE thr.Id = c.Thread AND c.Id = s.Call AND s.Id = i.Segment AND i.Id = iti.Instruction and iti.Tag = t.Id LIMIT 1
)
INSERT INTO TagInstance(Id, Tag, Thread, Counter, Start, End, StartTime, EndTime,
  Duration, DurationMs) SELECT
  Id,
	Tag,
  Thread,
  Counter,
  Start,
  End,
  strftime('%Y-%m-%dT%H:%M:%fZ', (SELECT StartTime FROM ThreadTimings), '+' || CAST ((t.Start / (SELECT TSCPerMillisecond FROM ThreadTimings) / 1000) AS TEXT) || ' seconds'),
  strftime('%Y-%m-%dT%H:%M:%fZ', (SELECT StartTime FROM ThreadTimings), '+' || CAST ((t.End / (SELECT TSCPerMillisecond FROM ThreadTimings) / 1000) AS TEXT) || ' seconds'),
  End - Start AS Duration,
  (t.End - t.Start) / (SELECT TSCPerMillisecond FROM ThreadTimings)
FROM TagInstanceOld t;
DROP TABLE TagInstanceOld;
