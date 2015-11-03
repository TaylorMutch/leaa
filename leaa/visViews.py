__author__ = 'Taylor'
import json
from django.db.models import Q
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view
from leaa.models import Terrain, Station, DataFile
from fileReader import readSDR, readTerrain  # readRecordDateToString, dateStringToDate

@api_view(['GET'])
def getDates(request):
    terrainID = request.GET.get('terrainID')
    stations = Station.objects.filter(terrain=terrainID)
    dates = []
    stationNames = []
    for station in stations:
        stationNames.append(station.name)
        datafile = DataFile.objects.filter(station=station)
        for file in datafile:
            date = str(file.creationDate)[:10]
            if not (date in dates):
                dates.append(date)
    result = {'dates':dates, 'stationNames':stationNames}
    return HttpResponse(json.dumps(result), status=status.HTTP_200_OK)


@api_view(['GET'])
def getStationObjects(request):
    stationNames = request.GET.getlist('stations[]')
    recordDate = str(request.GET.get('recordDate'))
    result = {}
    for stationName in stationNames:
        stationResult = {}
        station = Station.objects.get(name=stationName)
        query = Q(creationDate=recordDate) & Q(station=station)

        # Try to get file from disk. If we have an error, we just bail
        # TODO: Make this better
        try:
            file = DataFile.objects.get(query)
            # Get data from file on disk
            heights, dates, speeds, directions = readSDR(file, station)
            stationResult = {'heights': heights, 'dates': dates, 'speeds': speeds, 'directions': directions}
            # Get data from sqlite db
            stationResult['name']       = station.name
            stationResult['demX']       = station.demX
            stationResult['demY']       = station.demY
            stationResult['lat']        = station.lat
            stationResult['long']       = station.long
            stationResult['terrain']    = station.terrain_id
            stationResult['id'] = station.id
        except:
            continue
        result[stationName] = stationResult
        '''
        datafiles = DataFile.objects.filter(query)
        if len(datafiles) != 0:
            for file in datafiles:
                # Get data from file on disk
                heights, dates, speeds, directions = readSDR(file, station)
                stationResult = {'heights': heights, 'dates': dates, 'speeds': speeds, 'directions': directions}
                # Get data from sqlite db
                stationResult['name']       = station.name
                stationResult['demX']       = station.demX
                stationResult['demY']       = station.demY
                stationResult['lat']        = station.lat
                stationResult['long']       = station.long
                stationResult['terrain']    = station.terrain_id
                stationResult['id'] = station.id
            result[stationName] = stationResult
        '''
    return HttpResponse(json.dumps(result), status=status.HTTP_200_OK)


@api_view(['GET'])
def getTerrain(request):
    terrain = Terrain.objects.get(pk=request.GET.get('terrainID'))
    file = readTerrain(terrain)
    return HttpResponse(file, status=status.HTTP_200_OK)
