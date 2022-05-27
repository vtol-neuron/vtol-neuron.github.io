import { NeuronFeatureBase } from "./neuron_feature_base";
import { NeuronInterfacePoint, NeuronInterfacePointData } from "./neuron_interfaces";
import { L, create_popup_context_dom, LeafletContextMenuItem } from "./leaflet_interface";
import { NeuronHelp } from "./neuron_help";

export interface NeuronFeaturePointData {
    version:string,
    type:string,
    point:NeuronInterfacePointData,
    wait_duration:number,
}

export class NeuronFeatureWaypoint extends NeuronFeatureBase {
    static override NAME = "Waypoint";
    static override TYPE = "NeuronFeatureWaypoint";
    static override VERSION = 'a8bc5a60-dd6e-11ec-bef2-1be7bc5596a6';
    static override HELP_KEY = 'waypoint';

    #marker:L.Marker;
    #point:NeuronInterfacePoint;
    #dom:HTMLDivElement;
    #dom_lat:HTMLInputElement;
    #dom_lon:HTMLInputElement;
    #dom_alt:HTMLInputElement;
    #dom_hdg:HTMLInputElement;
    #dom_wait:HTMLInputElement;

    #wait_duration:number;

    constructor(map:L.Map, point:NeuronInterfacePoint=null) {
        super(map);

        this.#marker = null;
        this.#point = null;
        this.#dom = null;
        this.#dom_lat = null;
        this.#dom_lon = null;
        this.#dom_alt = null;
        this.#dom_hdg = null;
        this.#dom_wait = null;

        this.#wait_duration = 0;

        if(point)
            this.set_point(point);
    }

    remove_point_by_context(context:L.Marker) {
        if(this.#marker == context) {
            this.remove_feature();
        } else {
            console.warn("Call to remove unknown marker context");
        }
    }

    #remove_point_by_event(event:L.LeafletEvent) {
        this.remove_point_by_context(event.target);
    }

    #update_position_from_event(event:L.LeafletEvent) {
        let point = NeuronInterfacePoint.from_leaflet(event.target.getLatLng());
        if (this.#point)
            point.altitude = this.#point.altitude;
        this.#internal_set_point(point);
    }

    set_point(point:NeuronInterfacePoint) {
        if(!this.#marker) {
            this.#marker = L.marker(point.to_leaflet(),{
                draggable: true,
                autoPan: true,
            })

            this.#marker.on("drag", this.#update_position_from_event.bind(this));
            this.#marker.on("dblclick", this.#remove_point_by_event.bind(this));

            const menu_items = [
                new LeafletContextMenuItem("Show in plan", "fa-bars", this.show_on_plan.bind(this)),
                null,
                new LeafletContextMenuItem("Remove", "fa-trash", this.remove_point_by_context.bind(this)),
            ]
            this.#marker.bindPopup(create_popup_context_dom("Waypoint", menu_items, this.#marker));

            this._add_layer_to_map(this.#marker);
        }

        this.#internal_set_point(point);
    }

    show_on_plan() {
        if(this.#dom) {
            this.#dom.scrollIntoView();
            this.#dom.classList.remove('mission-feature-highlight-remove');
            this.#dom.classList.add('mission-feature-highlight');
            setTimeout(this.#remove_dom_highlight.bind(this), 1000);
        }
    }

    #remove_dom_highlight() {
        if(this.#dom) {
            this.#dom.classList.remove('mission-feature-highlight');
            this.#dom.classList.add('mission-feature-highlight-remove');
        }
    }

    #internal_set_point(point:NeuronInterfacePoint, update_marker:boolean = true, update_dom:boolean=true) {
        this.#point = point;

        if(update_marker && this.#marker)
            this.#marker.setLatLng(point.to_leaflet());

        if(update_dom) {
            if(this.#dom_lat)
                this.#dom_lat.value = point.latitude.toString();

            if(this.#dom_lon)
                this.#dom_lon.value = point.longitude.toString();

            if(this.#dom_alt)
                this.#dom_alt.value = (point.altitude / NeuronFeatureBase._altitude_ratio).toString();

            if(this.#dom_hdg)
                this.#dom_hdg.value = point.heading.toString();
        }

        this._trigger_on_changed();
    }

    get_wait_duration() {
        return this.#wait_duration;
    }

    set_wait_duration(wait_duration:number) {
        this.#wait_duration = wait_duration;

        if(this.#dom_wait)
            this.#dom_wait.value = this.#wait_duration.toString();
    }

    #update_latitude_from_dom() {
        if(this.#point && this.#dom_lat)
            this.#point.latitude = this.#dom_lat.valueAsNumber;

        this.#internal_set_point(this.#point, true, false);
    }

    #update_longitude_from_dom() {
        if(this.#point && this.#dom_lon)
            this.#point.longitude = this.#dom_lon.valueAsNumber;

        this.#internal_set_point(this.#point, true, false);
    }

    #update_altitude_from_dom() {
        if(this.#point && this.#dom_alt)
            this.#point.altitude = this.#dom_alt.valueAsNumber * NeuronFeatureBase._altitude_ratio;

        this.#internal_set_point(this.#point, true, false);
    }

    #update_heading_from_dom() {
        if(this.#point && this.#dom_hdg)
            this.#point.heading = this.#dom_hdg.valueAsNumber;

        this.#internal_set_point(this.#point, true, false);
    }

    #update_wait_duration_from_dom() {
        this.#wait_duration = this.#dom_wait.valueAsNumber;
    }

    override show_help() {
        window.neuron_map.show_map_help(true, `${NeuronHelp.HELP_PREFIX_MISSION}-${NeuronFeatureWaypoint.HELP_KEY}`);
    }

    override remove_feature() {
        if(this.#marker)
            this._remove_layer_from_map(this.#marker);

        super.remove_feature();
    }

    override get_path_coords() {
        return this.#point ? [this.#point] : [];
    }

    override get_dom() {
        if(!this.#dom) {
            this.#dom = this._get_dom("Waypoint");

            let c = document.createElement("div");
            c.className = 'mission-feature-content';

            const t0 = "Latitude location for the waypoint in decimal degrees";
            this.#dom_lat = this._create_dom_input_number(this.#point ? this.#point.latitude : 0.0, this.#update_latitude_from_dom.bind(this), -90, 90, 0.0002);
            this.#dom_lat.title = t0;
            c.appendChild(this._create_dom_label("Latitude:", this.#dom_lat, t0));
            c.appendChild(this.#dom_lat);

            const t1 = "Longitude location for the waypoint in decimal degrees";
            this.#dom_lon = this._create_dom_input_number(this.#point ? this.#point.longitude : 0.0, this.#update_longitude_from_dom.bind(this), -180, 180, 0.0002);
            this.#dom_lon.title = t1;
            c.appendChild(this._create_dom_label("Longitude:", this.#dom_lon, t1));
            c.appendChild(this.#dom_lon);

            const t2 = "Altitude for the waypoint in feet relative to take-off location ground level";
            this.#dom_alt = this._create_dom_input_number((this.#point ? this.#point.altitude : 0.0) / NeuronFeatureBase._altitude_ratio, this.#update_altitude_from_dom.bind(this));
            this.#dom_alt.title = t2;
            c.appendChild(this._create_dom_label("Altitude:", this.#dom_alt, t2));
            c.appendChild(this.#dom_alt);

            const t3 = "Heading for the waypoint in degrees relative to North";
            this.#dom_hdg = this._create_dom_input_number((this.#point ? this.#point.heading : 0.0), this.#update_heading_from_dom.bind(this), -180, 180);
            this.#dom_hdg.title = t3;
            c.appendChild(this._create_dom_label("Heading:", this.#dom_hdg, t3));
            c.appendChild(this.#dom_hdg);

            const t4 = "Duration in seconds for the aircraft to hold position at the waypoint";
            this.#dom_wait = this._create_dom_input_number(this.#wait_duration, this.#update_wait_duration_from_dom.bind(this), 0);
            this.#dom_wait.title = t4;
            c.appendChild(this._create_dom_label("Wait:", this.#dom_wait, t4));
            c.appendChild(this.#dom_wait);

            this.#dom.append(c);
        }

        return this.#dom;
    }

    static override isObjectOfDataType(object: any): object is NeuronFeaturePointData {
        let is_valid =
            (object.type == NeuronFeatureWaypoint.TYPE) ||
            (object.version == NeuronFeatureWaypoint.VERSION);

        return is_valid;
    }

    static override from_json(j:NeuronFeaturePointData, map:L.Map) {
        //XXX: Implement this per inherited feature
        if(!NeuronFeatureWaypoint.isObjectOfDataType(j))
            throw new Error(`Invalid type check during creation of NeuronFeaturePoint`);

        const point = NeuronInterfacePoint.from_json(j.point);
        const p = new NeuronFeatureWaypoint(map, point);
        p.set_wait_duration(j.wait_duration);
        return p;
    }

    override to_json() {
        //XXX: Implement this per inherited feature
        return <NeuronFeaturePointData>{
            version: NeuronFeatureWaypoint.VERSION,
            type: NeuronFeatureWaypoint.TYPE,
            point: this.#point.to_json(),
            wait_duration: this.#wait_duration,
        }
    }
}
