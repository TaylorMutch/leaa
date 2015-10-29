__author__ = 'Taylor'
from django.conf.urls import url
from leaa import visViews


urlpatterns = [
    #url(r'^getVectors/', visViews.getVectors),
    #url(r'^getStations/', visViews.getStations),
    #url(r'^getTerrainNames/', visViews.getTerrainNames),
    url(r'^getDates/', visViews.getDates),
    url(r'^getStationObjects/', visViews.getStationObjects),
    ]
