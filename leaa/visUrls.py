__author__ = 'Taylor'
from django.conf.urls import url
from leaa import visViews


urlpatterns = [
    url(r'^getTerrain/', visViews.getTerrain),
    url(r'^getDates/', visViews.getDates),
    url(r'^getStationObjects/', visViews.getStationObjects),
    url(r'^getSettings/', visViews.getSettings),
    url(r'^setSettings/', visViews.setSettings),
    url(r'^saveTerrainView/', visViews.saveTerrainView),
    url(r'^getTerrainViews/', visViews.getTerrainViews),
    ]
