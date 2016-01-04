/*
 * Copyright 2015 Siemens Technology and Services
 *
 * Title:				cppunit_2_loops_without_calls.cpp
 * Author:			Andreas Wilhelm
 * Created:			2015-11-17
 * Description: Unit test case 2 for C++ data collector.
 */

int main(int argc, char** argv) {

	int g = 0;

	for (int i=0; i<3; i++) {
		int x = 5;
		int y = x + 1;

		for (int j=0; j<2; j++) {
			y++;
		}

		g = x + y;
	}

	g++;

	while (g > 0) {
		g--;
	}

	return 0;
}
