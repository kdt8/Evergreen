dojo.require('dojo.data.ItemFileReadStore');
dojo.require('dijit.layout.SplitContainer');
dojo.require('dijit.Dialog');
dojo.require('dijit.form.FilteringSelect');
dojo.require('dijit.form.Button');
dojo.require('dojox.grid.Grid');

dojo.require("openils.User");
dojo.require("openils.acq.Fund");
dojo.require("openils.acq.Lineitems");
dojo.require('openils.acq.Provider');
dojo.require("openils.widget.FundSelector");
dojo.require('openils.editors');
dojo.require("openils.widget.OrgUnitFilteringSelect");
dojo.require("fieldmapper.OrgUtils");

var globalUser = new openils.User();

/* put all the accessors, etc. into a local object for namespacing */
var JUBGrid = {
    jubGrid : null,
    lineitems : [], // full list of lineitem objects to display 
    getLi : function(id) { 
        // given an ID, returns the lineitem object from the list
        for(var i in JUBGrid.lineitems) {
            var li = JUBGrid.lineitems[i];
            if(li.id() == id)
                return li;
        }
    },

    _getMARCAttr : function(rowIndex, attr) {
        var data = JUBGrid.jubGrid.model.getRow(rowIndex);
        if (!data) return '';
        return new openils.acq.Lineitems(
            {lineitem:JUBGrid.getLi(data.id)}).findAttr(attr, 'lineitem_marc_attr_definition')
    },
    getJUBTitle : function(rowIndex) {
        return JUBGrid._getMARCAttr(rowIndex, 'title');
    },
    getJUBAuthor : function(rowIndex) {
        return JUBGrid._getMARCAttr(rowIndex, 'author');
    },
    getJUBIsbn : function(rowIndex) {
        return JUBGrid._getMARCAttr(rowIndex, 'isbn');
    },
    getJUBPrice : function(rowIndex) {
        return JUBGrid._getMARCAttr(rowIndex, 'price');
    },
    getJUBPubdate : function(rowIndex) {
        return JUBGrid._getMARCAttr(rowIndex, 'pubdate');
    },
    getProvider : function(rowIndex) {
        data = JUBGrid.jubGrid.model.getRow(rowIndex);
        if(!data || !data.provider) return;
        return openils.acq.Provider.retrieve(data.provider).code();
    },
    getLIDFundName : function(rowIndex) {
        var data = JUBGrid.jubDetailGrid.model.getRow(rowIndex);
        if (!data || !data.fund) return;
        try {
            return openils.acq.Fund.retrieve(data.fund).name();
        } catch (evt) {
            return data.fund;
        }
    },
    getLIDLibName : function(rowIndex) {
        var data = JUBGrid.jubDetailGrid.model.getRow(rowIndex);
        if (!data || !data.owning_lib) return;
        return fieldmapper.aou.findOrgUnit(data.owning_lib).shortname();
    },
    populate : function(gridWidget, model, lineitems) {
	for (var i in lineitems) {
	    JUBGrid.lineitems[lineitems[i].id()] = lineitems[i];
	}
        JUBGrid.jubGrid = gridWidget;
        JUBGrid.jubGrid.setModel(model);
        if(JUBGrid.showDetails) {
            dojo.connect(gridWidget, "onRowClick", 
                function(evt) {
            var jub = model.getRow(evt.rowIndex);
            var grid;

            JUBGrid.jubDetailGrid.lineitemID = jub.id;

            if (jub.state == "approved") {
                grid = JUBGrid.jubDetailGridLayoutReadOnly;
            } else {
                grid = JUBGrid.jubDetailGridLayout;
            }
            openils.acq.Lineitems.loadGrid(
                        JUBGrid.jubDetailGrid, 
                        JUBGrid.jubGrid.model.getRow(evt.rowIndex).id, grid);
                });
        }
        gridWidget.update();
    },

    approveJUB: function(evt) {
	var list = [];
	var selected = JUBGrid.jubGrid.selection.getSelected();

	for (var idx = 0; idx < selected.length; idx++) {
	    var rowIdx = selected[idx];
	    var jub = JUBGrid.jubGrid.model.getRow(rowIdx);
	    var li = new openils.acq.Lineitems({lineitem:JUBGrid.getLi(jub.id)});
	    var approveStore = function() {
		var approveACQLI = function(jub, rq) {
		    JUBGrid.jubGrid.model.store.setValue(jub,
							 "state", "approved");
		};
		JUBGrid.jubGrid.model.store.fetch({query:{id:jub.id},
						   onItem: approveACQLI});
	    };

	    li.setState("approved", approveStore);
	}

	JUBGrid.jubGrid.update();
    },

    deleteLID: function(evt) {
	var list =[];
	var selected = JUBGrid.jubDetailGrid.selection.getSelected();
	for (var idx = 0; idx < selected.length; idx++) {
	    var rowIdx = selected[idx];
	    var lid = JUBGrid.jubDetailGrid.model.getRow(rowIdx);
	    var deleteFromStore = function () {
		var deleteItem = function(item, rq) {
		    JUBGrid.jubDetailGrid.model.store.deleteItem(item);
		};
		JUBGrid.jubDetailGrid.model.store.fetch({query:{id:lid.id},
							 onItem: deleteItem});
	    };

	    openils.acq.Lineitems.deleteLID(lid.id, deleteFromStore);
	    JUBGrid.jubDetailGrid.update();

	    var updateCount = function(item) {
		var newval = JUBGrid.jubGrid.model.store.getValue(item, "item_count");
		JUBGrid.jubGrid.model.store.setValue(item, "item_count", newval-1);
		JUBGrid.jubGrid.update();
	    };

	    JUBGrid.jubGrid.model.store.fetch({query:{id:JUBGrid.jubDetailGrid.lineitemID},
					       onItem: updateCount});
	}
    },

    createLID: function(fields) {
	fields['lineitem'] = JUBGrid.jubDetailGrid.lineitemID;
	var addToStore = function () {
	    JUBGrid.jubDetailGrid.model.store.newItem(fields);
	    JUBGrid.jubGrid.update();
	    JUBGrid.jubGrid.refresh();
	}
	openils.acq.Lineitems.createLID(fields, addToStore);
    },
};

