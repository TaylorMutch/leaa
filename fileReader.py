__author__ = 'Taylor'

from leaa.models import DataFile, Station
import os
from vistas_project_alpha.settings import MEDIA_ROOT
from django.utils import timezone
from datetime import datetime, date
'''
Reads in a SoDAR file and sends it along to our view.
'''

months = [None, "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

tags = {'DCL', 'VCL', 'SDR', 'H  '}


def readSDR(file, station):

    filePath = station.terrain.name + '/'\
                + station.name + '/'\
                + str(file.creationDate.year) + '/' \
                + file.fileName
    with open(os.path.join(MEDIA_ROOT, filePath)) as datafile:
        data = datafile.readlines()
    datafile.close()
    numLines = len(data)

    dates = []
    speeds = []
    directions = []
    heights = []
    for i in range(0,numLines):
        line = data[i]
        tag = line[:3]
        if tag in tags:
            if tag == 'H  ' and len(heights) == 0:
                heights = [int(j) for j in line.strip().split()[1:]]
            elif tag == 'VCL':
                speeds.append([float(j) for j in line.strip().split()[1:]])
            elif tag == 'DCL':
                directions.append([float(j) for j in line.strip().split()[1:]])
            elif tag == 'SDR':
                dates.append(int(line[4:16]))

    return heights, dates, speeds, directions


def readRecordDateToDatetime(fileName, stationName):
    with open(os.path.join(MEDIA_ROOT, stationName + '/' + fileName + '.sdr')) as f:
        data = f.readline(16)
    f.close()
    date = sdrDateToDatetime(data[4:])
    return date


def readRecordDateToString(fileName, stationName):
    with open(os.path.join(MEDIA_ROOT, stationName + '/' + fileName + '.sdr')) as f:
        data = f.readline(16)
    f.close()
    date = sdrDateToString(data[4:])
    date = date[:11]
    return date


def createDataFile(fileName, stationName, creationDate):
    station_match = Station.objects.filter(name=stationName)[0]
    newDataFile = DataFile(station=station_match, fileName=fileName, creationDate=creationDate)
    newDataFile.save()
    print('Added ' + fileName + ' to station' + stationName)


def dateStringToDate(strDate):
    _date = date(int(strDate[:4]),int(strDate[4:6]),int(strDate[6:]))
    return _date

def sdrDateToDatetime(sdrDate):
    year = 2000 + int(sdrDate[0:2])
    month = int(sdrDate[2:4])
    day = int(sdrDate[4:6])
    hour = int(sdrDate[6:8])
    minute = int(sdrDate[8:10])
    sec = int(sdrDate[10:12])
    time = datetime(year, month, day, hour, minute, sec)
    return time


def sdrDateToString(sdrDate):
    year = str(2000 + int(sdrDate[0:2]))
    month = months[int(sdrDate[2:4])]
    day = str(int(sdrDate[4:6]))
    hour = sdrDate[6:8]
    minute = sdrDate[8:10]
    sec = sdrDate[10:12]
    time =  day +' '+month+', ' + year +' - ' + hour+':' + minute +':'+ sec
    return time

def sdrDateToString_YYYYMMDD(sdrDate):
    year = str(2000 + int(sdrDate[0:2]))
    month = str((sdrDate[2:4]))
    day = str(int(sdrDate[4:6]))
    return year + '-' + month + '-' + day