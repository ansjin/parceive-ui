/*
 * Copyright 2015 Siemens Technology and Services
 *
 * Title:				cppunit_4_small_recursion.cpp
 * Author:			Andreas Wilhelm
 * Created:			2015-11-17
 * Description: Unit test case 4 for C++ data collector.
 */
 
static int staticInt = 0;

int rec(const int& arg) {

	if (arg > 0)
		return  rec(arg-1);

	return staticInt + 1;
}


int main(int argc, char** argv) {

	rec(argc + 10);

	return 0;
}
