/*
 * Copyright 2015 Siemens Technology and Services
 *
 * Title:				cppunit_7_loops_inside_recursion.cpp
 * Author:			Andreas Wilhelm
 * Created:			2015-11-17
 * Description: Unit test case 7 for C++ data collector.
 */
 int global;

 int fct(int val) {
 	if (val == 0)
 		return 0;
 	else {
 		global = 0;
 		for(int i = 0; i < 2; i++)
 			global += fct (val - 1);
 		return global;
 	}
 }

 int main() {
 	fct(2);

 	return 0;
 }
