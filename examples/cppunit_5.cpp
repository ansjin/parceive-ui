/*
 * Copyright 2015 Siemens Technology and Services
 *
 * Title:				cppunit_5_small_recursion_with_loops.cpp
 * Author:			Andreas Wilhelm
 * Created:			2015-11-17
 * Description: Unit test case 5 for C++ data collector.
 */
static int staticInt = 20;

int rec(const int& arg) {

	if (arg > 0) {
		for (int i=1; i<arg; i++)
			staticInt -= i;

		return rec(arg-1);
	}

	return 1;
}


int main(int argc, char** argv) {

	for (int i=3; i<5; i++)
		rec(argc + i);

	return 0;
}
