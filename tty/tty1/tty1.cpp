#include <Windows.h>
#include <iostream>
#include <fstream>
#include <cctype>
#include <cstdio>
#include <cstring>

int main()
{
    HANDLE tty;
	DCB    dcb;
	BOOL   ok;
	COMMTIMEOUTS tmo;
	uint8_t   b;
	DWORD  n;
	std::ofstream f;
	f.open("data.txt");


	tty = CreateFile("COM4",
		GENERIC_READ | GENERIC_WRITE,
		0, // not shared
		nullptr, // default security
		OPEN_EXISTING,
		0,
		nullptr
		);
	ok = GetCommState(tty,&dcb);
	if (!ok) {
		std::cout << GetLastError() << "\n";
		return 1;
	}

	dcb.BaudRate = BAUD_9600;
	dcb.Parity = false;
	dcb.fOutxCtsFlow = false;
	dcb.fOutxDsrFlow = false;
	dcb.fDtrControl  = DTR_CONTROL_ENABLE;
	dcb.fDsrSensitivity = false;
	dcb.fOutX = false;
	dcb.fInX = false;
	dcb.fRtsControl = RTS_CONTROL_ENABLE;

	ok = SetCommState(tty,&dcb);
	if (!ok) {
		std::cout << GetLastError() << "\n";
		return 1;
	}

	ok = GetCommTimeouts(tty,&tmo);
	if (!ok) {
		std::cout << GetLastError() << "\n";
		return 1;
	}

	tmo.ReadIntervalTimeout = 0;
	tmo.ReadTotalTimeoutConstant = 0;
	tmo.ReadTotalTimeoutMultiplier = 0;
	tmo.WriteTotalTimeoutConstant = 0;
	tmo.WriteTotalTimeoutMultiplier = 0;

	ok = SetCommTimeouts(tty,&tmo);
	if (!ok) {
		std::cout << GetLastError() << "\n";
		return 1;
	}

	int state;
	uint8_t nmea[512];
	uint8_t ubx[512];
	uint32_t count;
	uint32_t index;
	uint32_t len;
	index = 0;
	state = 0;
	for (;;) {
		ok = ReadFile(tty,&b,1,&n,0);

		// don't exceed buffer lengths
		if (index >= 512) {
			state = 0;
		}
		switch (state) {
		case 0:
			index = 0;
			// looking for $
			if (b == '$') {
				memset(nmea,0,sizeof(nmea));
				nmea[index++] = b;
				state = 1;
			}
			else if (b == 0xb5) {
				// sync character
				memset(ubx,0,sizeof(ubx));
				ubx[index++] = b;
				state = 10;
			}
			break;
		case 1:
			// looking for G
			if (b == 'G') {
				nmea[index++] = b;
				state = 2;
			}
			break;
		case 2:
			nmea[index++] = b;
			if (b == 0x0a) {
				nmea[index] = 0;
				std::cout << nmea;
				state = 0;
			}
			break;
		case 10:
			// ubx message
			if (b == 0x62) {
				// its a ubx message
				ubx[index++] = b;
				state = 11;
				count = 0;
			}
			else {
				state = 0;
			}
			break;
		case 11:
			// skip class and id
			ubx[index++] = b;
			count++;
			if (count == 2) {
				state = 12;
			}
			break;
		case 12:
			ubx[index++] = b;
			// first length byte
			len = b; // lsb of length
			state = 13;
			break;
		case 13:
			ubx[index++] = b;
			len += (b << 8); // msg of length
			len += 2; // for checksum
			count = 0;
			state = 14;
			break;
		case 14:
			// throw away ubx bytes
			ubx[index++] = b;
			count++;
			if (count >= len) {
				state = 0;
			}
			break;
		default:
			state = 0;
			break;
		}
	}
	return 0;
}
