/*
 * Copyright 2015 Siemens Technology and Services
 *
 * Title:				cppunit_1_simple_calls.cpp
 * Author:			Andreas Wilhelm
 * Created:			2015-11-17
 * Description: Unit test case 1 for C++ data collector.
 */

int global = 41;

int foo(const int& arg) {
  return arg + global--;
}

int bar(const int& arg) {
  return arg - global++;
}

int main(int argc, char** argv) {

  foo(bar(argc+10));

	return 0;
}
