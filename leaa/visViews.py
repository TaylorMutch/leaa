__author__ = 'Taylor'
import json
from django.db.models import Q
from django.http import HttpResponse
from rest_framework import status

from rest_framework.decorators import api_view
from vistas_project_alpha.settings import MEDIA_ROOT
from leaa.models import Terrain, Station, DataFile
from fileReader import readSDR, readRecordDateToString, dateStringToDate

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
    #datafiles = DataFile.objects.filter(creationDate=recordDate)
    for stationName in stationNames:
        stationResult = {}
        station = Station.objects.get(name=stationName)
        query = Q(creationDate=recordDate) & Q(station=station)
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
    return HttpResponse(json.dumps(result), status=status.HTTP_200_OK)