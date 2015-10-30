__author__ = 'Taylor'

import struct
import math
import requests
import os
from leaa.models import Terrain, Station, DataFile
from vistas_project_alpha.settings import MEDIA_ROOT

# Our height generation server. Location could change...
server = 'http://dodeca.coas.oregonstate.edu:8080/terrainextraction.ashx?'

'''
    Makes a request to our terrain generation server and then outputs a .bin in web-friendly format.
    Uses a version of convert_envi.py
'''
def create_terrain(_name, lat1, lat2, lng1, lng2, numlngs, numlats=-1):

    _fileName = _name + '.bin'

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
    except requests.HTTPError:
        return

    lat1 = float(lat1)
    lat2 = float(lat2)
    lng1 = float(lng1)
    lng2 = float(lng2)
    numlngs = int(numlngs)
    numlats = int(numlats)

    _maxHeight = 0
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

    # TODO: Add validation if the directory already exists, and possibly have some way of telling the user...

    filePath = os.path.join(MEDIA_ROOT, _name)
    os.mkdir(filePath)
    with open( os.path.join(filePath, _fileName), 'wb') as f_out:
        index = 0
        for i in range(1, numlats + 1):
            index = len(r.content) - i*4*numlngs  # floats are 4 bytes long
            floats = struct.unpack('f' * numlngs, r.content[index: index + 4*numlngs])
            ints = (math.floor(x) for x in floats)
            for val in ints:
                if val > _maxHeight:   # get the maxHeight, goes in our new Model object
                    _maxHeight = val
                f_out.write(struct.pack('H', val))
        print(max)

    # Create our object in the database
    _DEMx = numlats
    _DEMy = numlngs
    _MAPx = 100
    _MAPy = int(100*numlats/numlngs)
    t = Terrain(name=_name,
                fileName=_fileName,
                DEMx=_DEMx,
                DEMy=_DEMy,
                MAPx=_MAPx,
                MAPy=_MAPy,
                maxHeight=_maxHeight,
                north_lat=lat1,
                south_lat=lat2,
                east_lng=lng1,
                west_lng=lng2
                )
    # Save the object
    t.save()


'''
    Creates a DB row in our stations table based off of values from the terrain row passed to it.
'''
def create_station(name, t, lat, long):

    t_dist_lng = t.east_lng - t.west_lng
    t_dist_lat = t.north_lat - t.south_lat
    if t_dist_lat < 0:
        t_dist_lat *= -1
    if t_dist_lng < 0:
        t_dist_lng *= -1
    d_lat = (t.north_lat - lat)/t_dist_lat
    d_lng = (long - t.west_lng)/t_dist_lng

    # pick the closest dem coordinates
    demY = int(round(t.DEMy * d_lat, 0))
    demX = int(round(t.DEMx * d_lng, 0))

    file_path = os.path.join(MEDIA_ROOT, t.name + '/' + name)
    os.mkdir(file_path)

    s = Station(name=name, terrain=t, lat=lat, long=long, demX=demX, demY=demY)
    s.save()