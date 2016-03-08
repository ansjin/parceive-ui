default: databases

cppunit_%: cppunit_%.cpp
	g++ -o $@ $<

cppunit_%.db: cppunit_%
	pin.sh -injection child -ifeellucky -t ../pin/libParceive.so -f filter.xml -b blacklist.xml -mode analyze -db $@ -- ./$<

databases: cppunit_1.db cppunit_2.db cppunit_3.db cppunit_4.db cppunit_5.db cppunit_6.db cppunit_7.db
