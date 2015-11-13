__author__ = 'Taylor'
import json
from django.db.models import Q
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view
from leaa.models import Terrain, Station, DataFile, Setting, TerrainView
from django.contrib.auth.models import User
from fileReader import readSDR, readTerrain

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
            # Get data from db
            stationResult['name'] = station.name
            stationResult['demX'] = station.demX
            stationResult['demY'] = station.demY
            stationResult['lat'] = station.lat
            stationResult['long'] = station.long
            stationResult['terrain'] = station.terrain_id
            stationResult['id'] = station.id
        except:
            continue
        result[stationName] = stationResult
    return HttpResponse(json.dumps(result), status=status.HTTP_200_OK)


@api_view(['GET'])
def getTerrain(request):
    terrain = Terrain.objects.get(pk=request.GET.get('terrainID'))
    file = readTerrain(terrain)
    return HttpResponse(file, status=status.HTTP_200_OK)


@api_view(['GET'])
def getSettings(request):
    if request.user.is_authenticated():
        result = {}
        user = User.objects.get(username=request.user.username)
        terrain = Terrain.objects.get(pk=request.GET['terrainID'])
        query = Q(user=user) & Q(terrain=terrain)
        settings = Setting.objects.filter(query)
        # TODO: Replace this? its a bit of a hack to get things working...
        if len(settings) == 0:  # We need to create new settings for this terrain user and save them
            new_settings = Setting(user=user, terrain=terrain)
            new_settings.save()
            settings = new_settings
            #return HttpResponse(json.dumps(result), status=status.HTTP_204_NO_CONTENT)
        else:   # We get the settings for this terrain user
            settings = settings[0]
        result['VectorHeight'] = settings.vectorHeight
        result['VectorLength'] = settings.vectorLength
        result['SceneHeight'] = settings.sceneHeight
        result['ArrowColor'] = settings.vectorColor
        result['LiveUpdate'] = settings.liveUpdate
        return HttpResponse(json.dumps(result), status=status.HTTP_200_OK)
    else:
        return HttpResponse(status=status.HTTP_511_NETWORK_AUTHENTICATION_REQUIRED)


@csrf_exempt
def setSettings(request):
    if request.user.is_authenticated():
        user = User.objects.get(username=request.user.username)
        terrain = Terrain.objects.get(pk=request.POST['terrainID'])
        query = Q(user=user) & Q(terrain=terrain)
        live = bool(request.POST['live'])
        vcolor = request.POST['color']
        sheight = float(request.POST['sheight'])
        vlen = float(request.POST['vlength'])
        vheight = float(request.POST['vheight'])
        try:
            settings = Setting.objects.get(query)
            settings.liveUpdate = live
            settings.vectorColor = vcolor
            settings.sceneHeight = sheight
            settings.vectorLength = vlen
            settings.vectorHeight = vheight
            settings.save()
        except:
            settings = Setting(vectorLength=vlen, vectorHeight=vheight, vectorColor=vcolor,
                               sceneHeight=sheight, liveUpdate=live, user=user, terrain=terrain)
            settings.save()
        return HttpResponse(status=status.HTTP_200_OK)
    else:
        return HttpResponse(status=status.HTTP_511_NETWORK_AUTHENTICATION_REQUIRED)


@api_view(['GET'])
def getTerrainViews(request):
    if request.user.is_authenticated():
        user = User.objects.get(username=request.user.username)
        terrain = Terrain.objects.get(pk=request.GET['terrainID'])
        query = Q(user=user) & Q(terrain=terrain)
        tvs = TerrainView.objects.filter(query)
        result = {}
        for tv in tvs:
            result[tv.id] = {'name': tv.name, 'pos': {'x': tv.pos_x, 'y': tv.pos_y, 'z': tv.pos_z}}
        return HttpResponse(json.dumps(result), status=status.HTTP_200_OK)
    else:
        return HttpResponse(status=status.HTTP_511_NETWORK_AUTHENTICATION_REQUIRED)


@csrf_exempt
def saveTerrainView(request):
    if request.user.is_authenticated():
        name = request.POST['name']
        pos_x = float(request.POST['x'])
        pos_y = float(request.POST['y'])
        pos_z = float(request.POST['z'])
        t = Terrain.objects.get(pk=request.POST['terrainID'])
        user = User.objects.get(username=request.user.username)
        tv = TerrainView(name=name, pos_x=pos_x, pos_y=pos_y, pos_z=pos_z, terrain=t, user=user)
        tv.save()
        return HttpResponse(status=status.HTTP_200_OK)
    else:
        return HttpResponse(status=status.HTTP_511_NETWORK_AUTHENTICATION_REQUIRED)
