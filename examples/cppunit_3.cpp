/*
 * Copyright 2015 Siemens Technology and Services
 *
 * Title:				cppunit_3_calls_inside_loop.cpp
 * Author:			Andreas Wilhelm
 * Created:			2015-11-17
 * Description: Unit test case 3 for C++ data collector.
 */

static int staticInt = 0;

void foo(const int& arg) {

	staticInt += arg;
}

int main(int argc, char** argv) {

	int a = 10+argc;

	for (int i=0; i<a; ++i) {
		foo(i);
	}

	return 0;
}
