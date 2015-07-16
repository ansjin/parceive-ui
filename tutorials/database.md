####Database conversion

This project does not work with the standard database in order to achieve better performance. The simplest change is the adding of indexes for all useful fields. Some tables have added fields that replace the need to implement complex and slow joins on multiple tables.

Currently changed tables

* CALL_TABLE - add caller field

####How to convert databases

#####gulp
When using gulp simply add the database files to the import folder and they will be processed by gulp automatically.

#####app.js
When using app.js the same effect is achieved by using the server to watch the import folder.
