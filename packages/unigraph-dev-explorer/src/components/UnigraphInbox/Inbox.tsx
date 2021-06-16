import { Accordion, AccordionDetails, AccordionSummary, ListItem, ListItemIcon, Typography, Select, MenuItem, List, ListSubheader, IconButton } from "@material-ui/core";
import { ClearAll, ExpandMore } from "@material-ui/icons";
import React from "react";
import { useDrop } from "react-dnd";
import { useEffectOnce } from "react-use"
import { getRandomInt, UnigraphObject } from "unigraph-dev-common/lib/api/unigraph";
import { byElementIndex } from "unigraph-dev-common/lib/utils/entityUtils";
import { AutoDynamicView } from "../ObjectView/DefaultObjectView";

type Group = {
    name: string,
    items: any[]
}

const grouper: any = {
    'date': (el: any[]) => {
        let groupsMap: any = {"Today": [], "Last week": [], "Last month": [], "Earlier": []};
        el.forEach(it => {
            if (it && it._timestamp && it._timestamp._updatedAt) {
                let day = new Date(it._timestamp._updatedAt);
                let now = new Date();
                if (now.getTime() - day.getTime() <= 1000*60*60*24 ) {
                    groupsMap['Today'].push(it);
                } else if (now.getTime() - day.getTime() <= 1000*60*60*24*7) {
                    groupsMap['Last week'].push(it);
                } else if (now.getTime() - day.getTime() <= 1000*60*60*24*31) {
                    groupsMap['Last month'].push(it);
                } else {
                    groupsMap['Earlier'].push(it);
                }
            } else {
                groupsMap['Earlier'].push(it)
            }
        });
        return Object.entries(groupsMap).map(([k, v]) => {return {name: k, items: v}})
    },
    'type': (el: any[]) => {
        let groupsMap: any = {};
        el.forEach(it => {
            let type = it?.type?.['unigraph.id'] || 'Other'
            if (groupsMap[type]) {
                groupsMap[type].push(it)
            } else {
                groupsMap[type] = [it]
            }
        })
        return Object.entries(groupsMap).map(([k, v]) => {return {name: k, items: v}})
    },
}

export const Inbox = () => {

    const [inbox, setInbox] = React.useState<any[]>([]);
    const [inboxEntity, setInboxEntity] = React.useState<any>({});
    const [listUid, setListUid] = React.useState("");

    const [optionsOpen, setOptionsOpen] = React.useState(false);
    const [groupBy, setGroupBy] = React.useState('');

    const getContext = () => inboxEntity;

    useEffectOnce(() => {
        const id = getRandomInt();

        window.unigraph.subscribeToObject("$/entity/inbox", (inbox: any) => {
            const children = inbox?.['_value']?.children?.['_value[']
            if (children) {
                setListUid(inbox?.['_value']?.children?.uid);
                children.sort(byElementIndex);
                setInbox(children); 
            } else {
                setInbox([]);
            };
            setInboxEntity(inbox);
        }, id);

        return function cleanup() {
            window.unigraph.unsubscribe(id);
        }
    })

    const [{ canDrop }, drop] = useDrop(() => ({
        // @ts-expect-error: already checked for namespace map
        accept: Object.keys(window.unigraph.getNamespaceMap() || {}),
        drop: (item: {uid: string}) => {
          window.unigraph.runExecutable('$/executable/add-item-to-list', {where: "$/entity/inbox", item: item.uid})
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        })
    }))

    return <div style={{
            backgroundImage: canDrop ? 'url("/assets/drop-here.png")' : '', 
            backgroundRepeat: "no-repeat", 
            backgroundPosition: "center", 
            height: "100%"
        }} ref={drop}>
            <div style={{display: "flex"}}><Accordion expanded={optionsOpen} onChange={() => setOptionsOpen(!optionsOpen)} variant={"outlined"} style={{flexGrow: 1}}> 
            <AccordionSummary  
            expandIcon={<ExpandMore />}
            aria-controls="panel1bh-content"
            id="panel1bh-header"
            >
            <Typography style={{flexBasis: '33.33%', flexShrink: 0}}>View options</Typography>
            <Typography>{inbox.length} items</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <List>
                    <ListItem>
                        <Typography>Group items by</Typography>
                        <Select
                            value={groupBy}
                            onChange={(ev) => {setGroupBy(ev.target.value as string)}}
                            style={{marginLeft: "24px"}}
                            displayEmpty
                        >
                            <MenuItem value={''}>None</MenuItem>
                            <MenuItem value={'date'}>Date added</MenuItem>
                            <MenuItem value={'type'}>Item type</MenuItem>
                        </Select>
                    </ListItem>
                </List>

            </AccordionDetails>
        </Accordion>
        <IconButton onClick={() => window.unigraph.deleteItemFromArray(listUid, inbox.map((el, idx) => idx))}><ClearAll/></IconButton>
        </div>
            
            {!groupBy.length ? inbox.map((el, index) => {
                return <React.Fragment>
                    <ListItem>
                        <ListItemIcon onClick={() => {
                            window.unigraph.deleteItemFromArray(listUid, el['uid'])
                        }} ><ClearAll/></ListItemIcon>
                        <AutoDynamicView object={new UnigraphObject(el['_value'])} callbacks={{
                                        context: inboxEntity,
                                        removeFromContext: (where: undefined | "left" | "right") => { 
                                            let uids = {"left": Array.from(Array(index).keys()), "right": undefined, "": undefined}[where || ""] || [el['uid']]
                                            console.log(uids)
                                            window.unigraph.deleteItemFromArray(listUid, uids)
                                        }
                                    }} />
                    </ListItem>
                </React.Fragment>
            }) : grouper[groupBy](inbox.map(it => it['_value'])).map((el: Group) => {
                return <React.Fragment>
                    <ListSubheader>{el.name}</ListSubheader>
                    {el.items.map(it => {
                        return <React.Fragment>
                            <ListItem>
                                <ListItemIcon onClick={() => {
                                    window.unigraph.deleteItemFromArray(listUid, it['uid'])
                                }} ><ClearAll/></ListItemIcon>
                                <AutoDynamicView 
                                    object={new UnigraphObject(it)}
                                    callbacks={{
                                        getContext: getContext,
                                        removeFromContext: () => { window.unigraph.deleteItemFromArray(listUid, it['uid'])}
                                    }} 
                                />
                            </ListItem>
                    </React.Fragment>
                    })}
                </React.Fragment>
            })}
    </div>

}