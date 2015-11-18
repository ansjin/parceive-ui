/*
 * Copyright 2015 Siemens Technology and Services
 *
 * Title:				cppunit_6_simple_calls_with_duration.cpp
 * Author:			Andreas Wilhelm
 * Created:			2015-11-17
 * Description: Unit test case 6 for C++ data collector.
 */

#include <cstdlib>
#include <unistd.h>

int g = 10;
static int s = 10;

int foo(int arg) {

	usleep(1000000); // sleep for 1 second

	g = g + arg;
	return g;
}

int bar(int& ref) {

	usleep(2000000); // sleep for 2 seconds

	ref = ref + g++;
	return s++;
}

int main(int argc, char** argv) {

	int l = 5 + g;

	foo(bar(l));

	return 0;
}
