import { useEffect, useState } from "react";
import {
  getPairTarget,
  getTargetScopeId,
  useClient,
  useDocumentForm,
  usePerspective,
  useTargetDocumentState,
  type Tool,
} from "sanity";
import { IntentLink } from "sanity/router";
import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import {
  Badge,
  Box,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";

interface RestaurantListItem {
  _id: string;
  restaurant_name?: string;
  avg_rating?: number;
  gluten_free?: boolean;
  cuisines?: { name?: string } | null;
  top_tags?: { name?: string }[];
  features?: { name?: string }[];
}

const RESTAURANTS_QUERY = /* groq */ `
  *[_type == "restaurant"] | order(restaurant_name asc) {
    _id,
    restaurant_name,
    avg_rating,
    gluten_free,
    "cuisines": cuisines->{name},
    "top_tags": top_tags[]->{name},
    "features": features[]->{name}
  }
`;

function formatRating(rating: number | undefined): {
  stars: string;
  label: string;
} {
  if (typeof rating !== "number" || Number.isNaN(rating)) {
    return { stars: "—", label: "no rating" };
  }
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return {
    stars: "★".repeat(rounded) + "☆".repeat(5 - rounded),
    label: rating.toFixed(1),
  };
}

function RestaurantsToolComponent() {
  const client = useClient({ apiVersion: "vX" });
  const [restaurants, setRestaurants] = useState<RestaurantListItem[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const { selectedVariantName } = usePerspective();
  console.log(selectedVariantName);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setRestaurants(null);
    client
      .request<RestaurantListItem[]>({
        uri: "/data/query/variants",
        query: {
          query: RESTAURANTS_QUERY,
          variant: selectedVariantName as string,
        },
      })

      .then((data) => {
        console.log(data);
        if (!cancelled) setRestaurants(data.result as RestaurantListItem[]);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load restaurants",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [client, selectedVariantName]);

  if (error) {
    return (
      <Container width={2} padding={4}>
        <Card padding={4} radius={2} tone="critical">
          <Text>Failed to load restaurants: {error}</Text>
        </Card>
      </Container>
    );
  }

  if (!restaurants) {
    return (
      <Flex
        align="center"
        justify="center"
        padding={5}
        style={{ minHeight: 240 }}
      >
        <Spinner muted />
      </Flex>
    );
  }

  return (
    <Container width={4} padding={4}>
      <Stack space={4}>
        <Flex align="center" justify="space-between">
          <Heading size={3}>Restaurants</Heading>
          <Text muted size={1}>
            {restaurants.length} total
          </Text>
        </Flex>

        {restaurants.length === 0 ? (
          <Card padding={4} radius={2} tone="transparent" border>
            <Text muted>No restaurants yet.</Text>
          </Card>
        ) : (
          <Grid columns={[1, 1, 2, 3]} gap={3}>
            {restaurants.map((r) => {
              const { stars, label } = formatRating(r.avg_rating);
              const cuisine = r.cuisines?.name || undefined;
              const tags = r.top_tags?.map((t) => t?.name).filter(Boolean) as
                string[] | undefined;
              const features = r.features
                ?.map((f) => f?.name)
                .filter(Boolean) as string[] | undefined;

              return (
                <IntentLink
                  key={r._id}
                  intent="edit"
                  params={{ id: r._id, type: "restaurant" }}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Card
                    padding={4}
                    radius={2}
                    shadow={1}
                    tone="default"
                    as="div"
                  >
                    <Stack space={3}>
                      <Heading size={1}>
                        {r.restaurant_name || "Untitled restaurant"}
                      </Heading>

                      <Flex align="center" gap={2}>
                        <Text weight="medium" style={{ letterSpacing: "2px" }}>
                          {stars}
                        </Text>
                        <Text muted size={1}>
                          {label}
                        </Text>
                        {r.gluten_free ? (
                          <Box marginLeft={2}>
                            <Badge tone="positive">Gluten-free</Badge>
                          </Box>
                        ) : null}
                      </Flex>

                      {cuisine ? (
                        <Text size={1} muted>
                          {cuisine}
                        </Text>
                      ) : null}

                      {tags && tags.length > 0 ? (
                        <Flex gap={1} wrap="wrap">
                          {tags.map((name, i) => (
                            <Badge
                              key={`${name}-${i}`}
                              tone="default"
                              mode="outline"
                            >
                              {name}
                            </Badge>
                          ))}
                        </Flex>
                      ) : null}

                      {features && features.length > 0 ? (
                        <Stack space={2}>
                          <Text
                            size={0}
                            muted
                            weight="medium"
                            style={{
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Features
                          </Text>
                          <Flex gap={1} wrap="wrap">
                            {features.map((name, i) => (
                              <Badge key={`${name}-${i}`} tone="primary">
                                {name}
                              </Badge>
                            ))}
                          </Flex>
                        </Stack>
                      ) : null}
                    </Stack>
                  </Card>
                </IntentLink>
              );
            })}
          </Grid>
        )}
      </Stack>
    </Container>
  );
}

export function restaurantsTool(): Tool {
  return {
    name: "restaurants",
    title: "Restaurants",
    icon: DocumentTextIcon,
    component: RestaurantsToolComponent,
  };
}
