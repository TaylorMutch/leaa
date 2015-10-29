__author__ = 'Taylor'
'''
    Makes a request to our terrain generation server and then outputs a .bin in web-friendly format.
    Uses a version of convert_envi.py
'''


import os, struct, sys, math, requests

server = 'http://dodeca.coas.oregonstate.edu:8080/terrainextraction.ashx?'


def main():
    if len(sys.argv) < 2:
        print('Usage: terrain_gen.py <terrainName>.bin')
        sys.exit(-1)

    output_path = sys.argv[1]
    if os.path.exists(output_path):
        overwrite_message = '{0} already exists. Overwrite? [y/n] '.format(output_path)
        if not input(overwrite_message).lower().startswith('y'):
            sys.exit(-1)

    lat1 = float(input('South Latitude: '))
    lat2 = float(input('North Latitude: '))
    lng1 = float(input('East Longitude: '))
    lng2 = float(input('West Longitude: '))
    numlngs = int(input('Number of segments: '))
    numlats = int(input('Number of latitude segments (-1 for equal aspect ratio): '))

    if (numlats == -1):
        payload = {'lat1': str(lat1),
                   'lat2': str(lat2),
                   'lng1': str(lng1),
                   'lng2': str(lng2),
                   'numlngs': str(numlngs)}
    else:
        payload = {'lat1': str(lat1),
                   'lat2': str(lat2),
                   'lng1': str(lng1),
                   'lng2': str(lng2),
                   'numlats': str(numlats),
                   'numlngs': str(numlngs)}

    try:
        r = requests.get(server, params=payload)
        print(r.content)
        print('Request successful, writing to ' + output_path + '\n')
    except requests.HTTPError:
        print('Request failed... a team of highly trained monkeys is on its way!')
        sys.exit(-1)

    max = 0

    if (numlats == -1): # Get the correct number of latitudes from the server
        form_feed = b'\x0c'
        index = 0
        myChar = b''
        while myChar != form_feed:
            myChar = r.content[index:index+1]
            if myChar == form_feed:
                break
            index +=1
        numlats = int(r.content[:index].decode('ascii').split()[5]) # this is the right position for numlats


    with open(output_path, 'wb') as f_out:
        index = 0
        for i in range(1, numlats + 1):
            index = len(r.content) - i*4*numlngs  # floats are 4 bytes long
            floats = struct.unpack('f' * numlngs, r.content[index: index + 4*numlngs])
            ints = (math.floor(x) for x in floats)
            for val in ints:
                if val > max:   # get the maxHeight, goes in our new Model object
                    max = val
                f_out.write(struct.pack('H', val))
        print(max)

if __name__ == '__main__':
    main()