"""
This script converts from a simple binary elevation format to ENVI. The format of the file is mixed ASCII and binary:

Line 0 - longitudes (west long, east long, numberOfSegments)
Line 1 - latitudes  (north lat, south lat, numberOfSegments)
Form_Feed charater (1 byte)
Every 4 bytes after the Form_Feed are floats containing elevation values.
"""

import os
import struct
import sys
import math


# input() in Py2 processes numbers only, so map to raw_input
#if sys.version_info[0] < 3:
#    input = raw_input


def main():
    if len(sys.argv) < 3:
        print('Usage: convert_envi.py <input grid> <output bin>')
        sys.exit(-1)

    input_path, output_path = sys.argv[1:3]
    if os.path.exists(output_path):
        overwrite_message = '{0} already exists. Overwrite? [y/n] '.format(output_path)
        if not input(overwrite_message).lower().startswith('y'):
            sys.exit(-1)


    with open(output_path + '.bin', 'wb') as f_out:
        with open(input_path, 'rb') as f_in:

            longs = f_in.readline().decode('ascii').split()
            #lng2 = float(longs[0])
            #lng1 = float(longs[1])
            numlngs = int(longs[2])
            print(numlngs)
            lats = f_in.readline().decode('ascii').split()
            #lat2 = float(lats[0])
            #lat1 = float(lats[1])
            numlats = int(lats[2])
            print(numlats)
            f_in.read(1)     # skip the form feed character

            begin_binary = f_in.tell()

            # Check to make sure we have a file of correct size. Additionally we get
            # the cursor in the right position to start reading data.
            f_in.seek(0, os.SEEK_END)
            assert f_in.tell() == numlngs * numlats * 4 + begin_binary

            f_in.seek(begin_binary, os.SEEK_SET)
            heightMap = struct.unpack('f' * numlats * numlngs, f_in.read(4*numlngs*numlats))

            max = 0
            for val in heightMap:
                if val > max:
                    max = val
            max = math.ceil(max)  # TODO: We need to record this in our new Model object
            print(max)

            # The binary format orders rows from bottom to top, while the ENVI format orders top to bottom.
            # So we'll read from the end of the binary file backwards
            for i in range(1, numlats + 1):
                f_in.seek(-i * numlngs * 4, os.SEEK_END)
                row = (struct.unpack('f' * numlngs, f_in.read(numlngs * 4)))
                newFileBytes = (math.floor(x) for x in row) # scale the value to an integer. floor or ceiling is fine
                for i in newFileBytes:
                    f_out.write(struct.pack('H', i))

if __name__ == '__main__':
    main()