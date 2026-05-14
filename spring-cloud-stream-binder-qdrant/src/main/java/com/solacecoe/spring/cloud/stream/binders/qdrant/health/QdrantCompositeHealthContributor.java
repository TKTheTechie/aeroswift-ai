package com.solacecoe.spring.cloud.stream.binders.qdrant.health;

import org.springframework.boot.actuate.health.CompositeHealthContributor;
import org.springframework.boot.actuate.health.HealthContributor;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.actuate.health.NamedContributor;
import org.springframework.lang.NonNull;

import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

/**
* And health contributor that provides the set of health indicators which describes the health of the qdrant binder.
*
* TODO: This is just an example of how to structure the project. Re-evaluate and modify the health contributor as required for your binder.
*/
public class QdrantCompositeHealthContributor implements CompositeHealthContributor {
	//TODO: The qdrant might refer to its connections (or not have a connection at all) as something else.
    //Feel free to rename this and/or add more sections as needed.
    private static final String CONNECTION_COMPONENT_NAME = "connection";

    private final Map<String, HealthContributor> contributors = new LinkedHashMap<>();

    @Override
    public HealthContributor getContributor(String name) {
        return contributors.get(name);
    }

    @NonNull
    @Override
    public Iterator<NamedContributor<HealthContributor>> iterator() {
        return contributors.entrySet().stream()
                .map(entry -> NamedContributor.of(entry.getKey(), entry.getValue())).iterator();
    }

	/**
	* Add a health indicator describing the health of the binder's connection.
    * @param connectionHealthIndicator the connection's health indicator.
    */
    public void addConnectionComponent(HealthIndicator connectionHealthIndicator) {
        contributors.put(CONNECTION_COMPONENT_NAME, connectionHealthIndicator);
    }

}
